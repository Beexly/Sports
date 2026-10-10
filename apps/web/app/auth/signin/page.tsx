import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/auth/callback-url-guard";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BrandLockup } from "@/components/brand/brand-lockup";

/**
 * C-330. Same gap as /auth/error: no metadata, so the page inherited the root
 * layout's default title. Indexability is inherited from app/auth/layout.tsx
 * (robots index:false, follow:false, nocache:true), so only the title is set here.
 */
export const metadata: Metadata = {
  title: "Sign in",
};

