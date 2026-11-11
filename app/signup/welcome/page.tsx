import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getSignupForEdit } from "@/lib/db/signups";
import { readApprovalStatus } from "@/lib/approval";
import { sendWelcomeAfterOnboarding } from "@/app/signup/actions";
import { hasSignupLogin, signupAccountPath } from "@/lib/signup-account";

export const metadata: Metadata = {
  title: "You're all set — GoPixel",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Status-aware "you're all set" screen. A family that self-verified their
// student's Stanford email on the previous step is already `approved`
// (confirmStudentCode) — telling them "we're reviewing you, wait for an email"
// is a dead-end that contradicts their real state. So when we can resolve the
// signup (via ?id=), we branch: approved families get a direct dashboard link;
// only genuinely-pending families see the review-and-email copy. A valid saved
// profile and its matching login are required before either completion message.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const validId = id && UUID_RE.test(id) ? id : null;

  if (!validId) notFound();
  const data = await getSignupForEdit(validId);
  if (!data) notFound();
  // A saved/verified profile is not evidence of a Clerk login. Invited students
  // bypass /signup entirely; old interrupted signups can have the same gap.
  // Check before stamping onboardedAt or sending the completion email.
  const user = await currentUser();
  if (!hasSignupLogin(user, data.signup.email)) redirect(signupAccountPath(validId));
  await sendWelcomeAfterOnboarding(validId);
  const approved = readApprovalStatus((data.signup.extra ?? {}) as Record<string, unknown>) === "approved";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-black px-6 text-center text-white">
      <Image
        src="/images/pixel-mascot.png"
        alt="GoPixel mascot"
        width={934}
        height={918}
        priority
        className="h-auto w-28"
      />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        You&apos;re all set. What&apos;s next:
      </h1>
      {approved ? (
        <p className="max-w-prose text-white/60">
          You&apos;re verified — your family is approved for the OHS family
          directory. Open your dashboard to explore other families.
        </p>
      ) : (
        <p className="max-w-prose text-white/60">
          We are reviewing your profile and confirming your OHS status. You will
          get an email from us. In the meantime, you can head to your dashboard.
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
        >
          Go to dashboard →
        </Link>
        <Link
          href="/"
          className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
        >
          Go to the GoPixel homepage
        </Link>
      </div>
    </main>
  );
}
