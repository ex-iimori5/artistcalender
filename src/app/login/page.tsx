import { signIn } from "@/actions/auth";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return <AuthForm action={signIn} mode="login" />;
}
