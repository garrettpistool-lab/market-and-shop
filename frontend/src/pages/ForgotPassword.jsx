export default function ForgotPassword() {
  return (
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold">Forgot your password?</h1>
      <p className="mt-3 text-gray-600">Enter your email and we'll send you a reset link.</p>
      <div className="mt-8 bg-white border rounded-3xl p-8">
        <input type="email" placeholder="your@email.com" className="w-full border p-3.5 rounded-2xl" />
        <button className="mt-4 w-full py-3.5 bg-[#083a9b] text-white rounded-3xl font-semibold">Send Reset Link</button>
      </div>
    </div>
  );
}