import { SignOutButton, SignUp, UserProfile } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSignupForEdit } from "@/lib/db/signups";
import { hasSignupLogin, signupAccountPath } from "@/lib/signup-account";
import { isSatelliteHost, PRIMARY_ORIGIN } from "@/lib/clerk-urls";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AccountReady } from "./account-ready";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finish login setup — GoPixel", robots: { index: false, follow: false } };

// Reuse the existing profile's private setup link. Never insert another signup
// or family here: invited and legacy users already have those records.
export default async function SignupAccountPage({ searchParams }: {
  searchParams: Promise<{ id?: string; next?: string }>;
}) {
  const { id, next } = await searchParams;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const stage = next === "profile" ? "profile" : "welcome";
  const self = signupAccountPath(id, stage);
  const data = await getSignupForEdit(id);
  if (!data) notFound();
  // Clear the satellite's stale browser draft before crossing origins, after
  // confirming the saved profile exists. Its setup URL carries the same ID.
  if (isSatelliteHost((await headers()).get("host"))) {
    return <AccountReady signupId={id} destination={`${PRIMARY_ORIGIN}${self}`} ready={false} />;
  }
  const user = await currentUser();
  const destination = `/signup/${stage === "profile" ? "thanks" : "welcome"}?id=${encodeURIComponent(id)}`;
  if (hasSignupLogin(user, data.signup.email)) return <AccountReady signupId={id} destination={destination} />;
  const ownsEmail = user?.emailAddresses.some((entry) =>
    entry.emailAddress.toLowerCase() === data.signup.email.trim().toLowerCase(),
  );

  return (
    <main className="min-h-dvh bg-black px-6 py-12 text-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold">Finish your login setup</h1>
        <p className="max-w-md text-white/65">
          Your GoPixel profile is saved. OHS verification confirms your school affiliation;
          this separate step creates the login you will use to return.
        </p>
        {user && ownsEmail ? (
          <>
            <p className="text-white/65">
              Verify {data.signup.email} and make it your primary email in your account settings below.
              Then continue to your saved profile.
            </p>
            <UserProfile routing="hash" appearance={clerkAppearance} />
            <a href={self} className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black">
              I&apos;ve updated my email — continue
            </a>
          </>
        ) : user ? (
          <>
            <p className="text-white/65">
              This profile needs a verified login using {data.signup.email} as its primary email.
              You are currently signed in with a different account.
            </p>
            <SignOutButton redirectUrl={self}>
              <button className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black">
                Sign out and continue with the profile email
              </button>
            </SignOutButton>
          </>
        ) : (
          <SignUp
            routing="hash"
            initialValues={{ emailAddress: data.signup.email }}
            forceRedirectUrl={self}
            signInForceRedirectUrl={self}
            signInUrl={`/sign-in?redirect_url=${encodeURIComponent(self)}`}
            appearance={clerkAppearance}
          />
        )}
      </div>
    </main>
  );
}
