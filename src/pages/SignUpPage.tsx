import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="auth-page flex flex-col items-center justify-center h-screen">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-md",
            headerTitle: "text-gray-900",
            headerSubtitle: "text-gray-600",
            socialButtonsBlockButton:
              "bg-white border-gray-200 hover:bg-gray-50",
            formButtonPrimary: "bg-blue-500 hover:bg-blue-600",
            footerActionLink: "text-blue-500 hover:text-blue-600",
          },
        }}
        afterSignUpUrl="/"
        signInUrl="/sign-in"
      />
    </div>
  );
}
