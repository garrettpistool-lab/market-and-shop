export default function OnboardingFlow({ user }) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold tracking-tight text-center">Welcome to Market and Shop!</h1>
      <p className="text-center text-gray-600 mt-2">Let's get your account set up.</p>

      <div className="mt-10 bg-white border rounded-3xl p-8">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-2xl bg-[#083a9b] text-white flex items-center justify-center font-bold">1</div>
            <div>Complete your profile</div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-2xl bg-[#083a9b] text-white flex items-center justify-center font-bold">2</div>
            <div>Explore the marketplace</div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-2xl bg-[#083a9b] text-white flex items-center justify-center font-bold">3</div>
            <div>Place your first order or set up your vendor profile</div>
          </div>
        </div>
        <button className="mt-8 w-full py-3.5 bg-[#083a9b] text-white rounded-3xl font-semibold">
          Start Onboarding
        </button>
      </div>
    </div>
  );
}