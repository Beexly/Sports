# Lumera Honest Image Pipeline — Product Spec

## Purpose
Make product images clean, fast, and premium without lying.

## Allowed transformations
- Crop
- Resize
- Compress
- Background removal
- Light/exposure correction
- Dust/surface cleanup that does not change product condition
- Shadow normalization
- Alt-text generation with review
- Device/social mockups clearly labeled as presentation mockups

## Disallowed transformations
- Change product color/material/size.
- Hide defects on used/conditioned products.
- Add logos or packaging that were not present.
- Remove watermarks from unlicensed images.
- Turn supplier images into fake owner-shot images.
- Generate lifestyle context implying use cases that are unsupported.

## Pipeline steps
1. Upload original.
2. Assign rights status.
3. Generate responsive derivatives.
4. Run image QA.
5. Create provenance entry.
6. Human review if transform touches product surface.
7. Attach to Truth Receipt.

## Image schema
```ts
type ProductImage = {
  id: string;
  productId: string;
  originalFileId: string;
  processedFileId?: string;
  rightsStatus: 'owned' | 'supplier_licensed' | 'public_domain' | 'unknown' | 'restricted';
  editType: string[];
  truthSafe: boolean;
  altText?: string;
  width: number;
  height: number;
  bytes: number;
  reviewedBy?: string;
  reviewedAt?: string;
};
```

## Acceptance criteria
- No product image publishes with unknown/restricted rights.
- No edited image publishes without provenance.
- Product-card and PDP images meet size/performance budgets.
- Any AI inpainting/edit to product area requires human review.
