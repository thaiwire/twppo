import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #111827 0%, #1e293b 100%)",
        padding: 16,
      }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
