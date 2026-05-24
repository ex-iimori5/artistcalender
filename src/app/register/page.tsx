import { signUp } from "@/actions/auth";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return <AuthForm action={signUp} mode="register" />;
}
