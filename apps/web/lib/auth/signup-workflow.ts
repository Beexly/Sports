"use workflow";
"use server";

import { db } from "@sports/db";
import { z } from "zod";
import { sleep } from "@/lib/workflow";
import { sendSignupEmail } from "@/lib/auth/signup-email";

type SignupWorkflowResult = {
  userId: string;
  status: "onboarded";
};

type SignupUser = {
  id: string;
  email: string;
};

const SignupEmailSchema = z.string().trim().email();
const ONBOARDING_EMAIL_DELAY = "5s";

async function createUser(email: string): Promise<SignupUser> {
  const normalizedEmail = SignupEmailSchema.parse(email).toLowerCase();
  const user = await db.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: { email: normalizedEmail },
    select: { id: true, email: true },
  });
  return user;
}

async function sendWelcomeEmail(user: SignupUser): Promise<void> {
  await sendSignupEmail(user.email, "welcome");
}

async function sendOnboardingEmail(user: SignupUser): Promise<void> {
  await sendSignupEmail(user.email, "onboarding");
}

export async function handleUserSignup(email: string): Promise<SignupWorkflowResult> {
  const user = await createUser(email);
  await sendWelcomeEmail(user);
  await sleep(ONBOARDING_EMAIL_DELAY);
  await sendOnboardingEmail(user);

  return {
    userId: user.id,
    status: "onboarded",
  };
}
