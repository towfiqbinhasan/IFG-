import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthBackdrop>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthBackdrop>
  );
}
