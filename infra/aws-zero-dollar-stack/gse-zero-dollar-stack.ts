// infra/aws-zero-dollar-stack/gse-zero-dollar-stack.ts
// $0/month steady-state sports-data ingestion & serving skeleton in us-east-2.
// Enforces: NO VPC/NAT Gateway ($32.85/mo trap), NO ALB ($16.43/mo), NO OpenSearch Serverless ($345/mo),
// NO Secrets Manager ($0.40/secret/mo -> uses free SSM Parameter Store Standard).

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class GseZeroDollarStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: { region: "us-east-2" },
    });

    // 1. Always-Free DynamoDB serving table (within 25GB + 25/25 RCU/WCU free allowance)
    const servingTable = new dynamodb.Table(this, "PredictionsServingTable", {
      tableName: "gse-predictions-serving",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 2. S3 Parquet Data Lake with aggressive lifecycle (credits cover pennies; no idle floor)
    const dataLake = new s3.Bucket(this, "SportsDataLake", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: "transition-old-parquet-to-ia",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // 3. Always-Free SQS Queue (1M req/mo free)
    const ingestQueue = new sqs.Queue(this, "IngestQueue", {
      queueName: "gse-sports-ingest-queue",
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    // 4. Free SSM Parameter Store config (replaces $0.40/mo Secrets Manager)
    const configParam = new ssm.StringParameter(this, "EngineModeParam", {
      parameterName: "/gse/engine/mode",
      stringValue: "shadow-sealed",
      tier: ssm.ParameterTier.STANDARD,
    });

    // 5. Always-Free ARM64 Lambda (1M req + 400k GB-s/mo free; NO VPC => NO NAT Gateway!)
    const ingestFn = new lambda.Function(this, "SportsIngestFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromInline(
        'exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ ok: true, region: "us-east-2" }) });'
      ),
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      logRetention: logs.RetentionDays.TWO_WEEKS, // Keeps CloudWatch under 5GB free limit
      environment: {
        TABLE_NAME: servingTable.tableName,
        BUCKET_NAME: dataLake.bucketName,
        QUEUE_URL: ingestQueue.queueUrl,
        CONFIG_PARAM: configParam.parameterName,
      },
    });

    // Free Lambda Function URL (avoids API Gateway charges at small scale)
    const fnUrl = ingestFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    servingTable.grantReadWriteData(ingestFn);
    dataLake.grantReadWrite(ingestFn);
    ingestQueue.grantSendMessages(ingestFn);
    configParam.grantRead(ingestFn);

    new cdk.CfnOutput(this, "IngestFunctionUrl", { value: fnUrl.url });
  }
}
