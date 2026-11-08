import { useState } from 'react';
import {
  Compass,
  Store,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from '../router';
import { useAuth, type UserRole } from '../store/AuthContext';
import { Logo } from '../components/Logo';
import { cx } from '../lib/format';

export default function Login() {
  const { navigate, path } = useRouter();
  const { login } = useAuth();

  // Parse initial role from query params if specified (e.g. /login?role=provider)
  const initialRole: UserRole = path.includes('role=provider') ? 'provider' : 'traveller';
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleNotice, setGoogleNotice] = useState(false);

  const isTraveller = selectedRole === 'traveller';

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setGoogleNotice(false);
  };

  const handleQuickDemoFill = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'traveller') {
      setIdentifier('ananya@travelsaathi.com');
      setPassword('traveller123');
    } else {
      setIdentifier('rajesh@puneheritagewalks.com');
      setPassword('partner123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setGoogleNotice(false);

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMessage(isTraveller ? 'Please enter your email or phone number.' : 'Please enter your provider email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({
        role: selectedRole,
        identifier: trimmedId,
        password,
      });

      if (res.success) {
        // Redirect according to selected role
        if (selectedRole === 'provider') {
          navigate('/provider');
        } else {
          navigate('/');
        }
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreAsGuest = async () => {
    setIsLoading(true);
    await login({
      role: 'traveller',
      identifier: 'guest@travelsaathi.com',
      password: 'guest',
      name: 'Guest Traveller',
    });
    setIsLoading(false);
    navigate('/');
  };

  const handleGoogleAuth = () => {
    setGoogleNotice(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#0B1538] flex flex-col justify-between selection:bg-[#FF7A35]/20 selection:text-[#0B1538]">
      {/* Top Navbar */}
      <header className="w-full border-b border-[#E1E6F0] bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <Logo />
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-[13px] font-medium text-[#64709A]">
              Discover more. Travel smarter.
            </span>
            <button
              type="button"
              onClick={handleExploreAsGuest}
              className="rounded-full border border-[#E1E6F0] bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-[#0B1538] hover:bg-[#F5F7FC] transition"
            >
              Explore as guest →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-fade-up">
        <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#E1E6F0] bg-white shadow-lift lg:grid lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column: Form & Role Selection */}
          <div className="p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Form Title & Greeting */}
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5EC] px-3 py-1 text-[12px] font-bold text-[#D95B0A]">
                  <Sparkles size={13} className="text-[#F2711C]" /> Travel Saathi Account
                </span>
                <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1538]">
                  Welcome to Travel Saathi
                </h1>
                <p className="mt-1 text-[14px] text-[#64709A]">
                  Choose your account type to access personalized experiences.
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="mb-6">
                <div className="text-[12.5px] font-bold uppercase tracking-wider text-[#64709A] mb-2.5">
                  How are you using Travel Saathi?
                </div>

                <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Account Role Selection">
                  {/* Traveller Role Card */}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isTraveller}
                    onClick={() => handleRoleChange('traveller')}
                    className={cx(
                      'group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 select-none focus:outline-none',
                      isTraveller
                        ? 'border-[#FF7A35] bg-gradient-to-br from-[#FFF5EC] to-white shadow-[0_4px_18px_rgba(255,107,53,0.15)] ring-2 ring-[#FF7A35]/30'
                        : 'border-[#E1E6F0] bg-white hover:border-[#C4C9DD] hover:bg-[#F5F7FC]/50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cx(
                          'grid h-10 w-10 place-items-center rounded-xl transition',
                          isTraveller ? 'bg-gradient-to-br from-[#FF7A35] to-[#E94675] text-white shadow-sm' : 'bg-[#EEF0F7] text-[#545E84] group-hover:text-[#0B1538]'
                        )}
                      >
                        <Compass size={20} />
                      </div>
                      {isTraveller && (
                        <span className="h-2 w-2 rounded-full bg-[#FF7A35] ring-4 ring-[#FF7A35]/20 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-3 font-display text-[15px] font-bold text-[#0B1538]">
                      Traveller
                    </div>
                    <div className="text-[11.5px] leading-snug text-[#64709A] mt-0.5">
                      Explore places, plan trips & discover local experiences.
                    </div>
                  </button>

                  {/* Provider Role Card */}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isTraveller}
                    onClick={() => handleRoleChange('provider')}
                    className={cx(
                      'group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 select-none focus:outline-none',
                      !isTraveller
                        ? 'border-[#0B1538] bg-gradient-to-br from-[#F6F7FB] to-white shadow-[0_4px_18px_rgba(11,21,56,0.12)] ring-2 ring-[#0B1538]/20'
                        : 'border-[#E1E6F0] bg-white hover:border-[#C4C9DD] hover:bg-[#F5F7FC]/50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cx(
                          'grid h-10 w-10 place-items-center rounded-xl transition',
                          !isTraveller ? 'bg-[#0B1538] text-white shadow-sm' : 'bg-[#EEF0F7] text-[#545E84] group-hover:text-[#0B1538]'
                        )}
                      >
                        <Store size={20} />
                      </div>
                      {!isTraveller && (
                        <span className="h-2 w-2 rounded-full bg-[#0B1538] ring-4 ring-[#0B1538]/20 animate-pulse" />
                      )}
                    </div>
                    <div className="mt-3 font-display text-[15px] font-bold text-[#0B1538]">
                      Provider
                    </div>
                    <div className="text-[11.5px] leading-snug text-[#64709A] mt-0.5">
                      List your experiences, manage bookings & grow your business.
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Role Greeting */}
              <div className="rounded-2xl bg-[#F5F7FC] p-3.5 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-bold text-[#0B1538]">
                    {isTraveller ? 'Welcome, traveller.' : 'Welcome, partner.'}
                  </div>
                  <div className="text-[12px] text-[#64709A]">
                    {isTraveller
                      ? 'Your next local experience starts here.'
                      : 'Manage your experiences and grow with Travel Saathi.'}
                  </div>
                </div>

                {/* Quick 1-Click Demo Fill for Testing */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill(selectedRole)}
                  className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-[#D95B0A] border border-[#FFCBA0] hover:bg-[#FFF5EC] transition shadow-xs"
                >
                  ⚡ Auto-fill Demo
                </button>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-[13px] font-semibold text-red-700 border border-red-200 animate-fade-up">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="flex-1">{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('')}
                    className="text-red-400 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Google OAuth Notice */}
              {googleNotice && (
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-[#EEF4FF] p-3.5 text-[12.5px] font-medium text-[#3B55B8] border border-[#DCE7FF] animate-fade-up">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-[#4E6BD6]" />
                  <div className="flex-1">
                    Google OAuth endpoint is prepared for production deployment. Use direct email credentials or the <b>⚡ Auto-fill Demo</b> button above to log in instantly.
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier Input */}
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-[13px] font-bold text-[#0B1538] mb-1.5"
                  >
                    {isTraveller ? 'Email or phone number' : 'Business email address'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BA2C0]">
                      {isTraveller ? <Mail size={17} /> : <Mail size={17} />}
                    </span>
                    <input
                      id="login-identifier"
                      type={isTraveller ? 'text' : 'email'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={isTraveller ? 'name@example.com or +91 98220 12345' : 'host@puneheritagewalks.com'}
                      className="h-12 w-full rounded-2xl border border-[#E1E6F0] bg-white pl-10 pr-4 text-[14px] text-[#0B1538] placeholder-[#9BA2C0] transition focus:border-[#FF7A35] focus:outline-none focus:ring-2 focus:ring-[#FF7A35]/20"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-[13px] font-bold text-[#0B1538]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Password reset link would be sent to your registered email or phone.')}
                      className="text-[12px] font-bold text-[#FF7A35] hover:text-[#D95B0A] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BA2C0]">
                      <Lock size={17} />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-2xl border border-[#E1E6F0] bg-white pl-10 pr-12 text-[14px] text-[#0B1538] placeholder-[#9BA2C0] transition focus:border-[#FF7A35] focus:outline-none focus:ring-2 focus:ring-[#FF7A35]/20"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9BA2C0] hover:text-[#0B1538] focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-13 mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#0B1538] text-white text-[15px] font-bold shadow-lift transition hover:bg-[#1B2852] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Authenticating…
                    </span>
                  ) : (
                    <>
                      <span>Continue to {isTraveller ? 'Travel Saathi' : 'Provider Dashboard'}</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E1E6F0]" />
                <span className="text-[12px] font-semibold text-[#9BA2C0] uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-[#E1E6F0]" />
              </div>

              {/* Google Login Action */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full h-11 flex items-center justify-center gap-2.5 rounded-2xl border border-[#E1E6F0] bg-white text-[13.5px] font-bold text-[#0B1538] hover:bg-[#F5F7FC] transition active:scale-[0.99]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.02h3.88c2.27-2.09 3.665-5.17 3.665-9.11z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.12C3.26 21.41 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.12z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.59 1.24 6.59l4.04 3.12c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Bottom Sign-up Link */}
            <div className="mt-6 text-center text-[13px] text-[#64709A]">
              {isTraveller ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('traveller')}
                    className="font-bold text-[#FF7A35] hover:text-[#D95B0A] hover:underline"
                  >
                    Sign up with Travel Saathi
                  </button>
                </>
              ) : (
                <>
                  New host in Pune?{' '}
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('provider')}
                    className="font-bold text-[#0B1538] hover:text-[#FF7A35] hover:underline"
                  >
                    Create provider account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Visual Travel Showcase (Hidden on Mobile) */}
          <div className="hidden lg:relative lg:flex lg:flex-col lg:justify-between p-10 overflow-hidden bg-[#0B1538] text-white">
            {/* Background Image with Atmospheric Gradient Overlay */}
            <img
              src="/images/experiences/shaniwar-wada-story.jpg"
              alt="Pune Heritage Experience"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-40 scale-105"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 122, 53, 0.35) 0%, rgba(244, 81, 90, 0.45) 45%, rgba(11, 21, 56, 0.92) 100%)',
              }}
            />

            {/* Top Badge */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur-md">
                <MapPin size={13} className="text-[#FF7A35]" /> Pune & Maharashtra
              </div>
            </div>

            {/* Middle Feature Highlights */}
            <div className="relative z-10 my-auto py-8">
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white">
                Discover the place <br />
                <span className="text-[#FFCBA0]">like a local.</span>
              </h2>

              <p className="mt-3 text-[14.5px] leading-relaxed text-white/80 max-w-sm">
                From authentic Old Pune food walks to Shaniwar Wada stories and hill viewpoints at sunset.
              </p>

              {/* Value proposition badges */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  '🍛 Curated Food Walks',
                  '🏛 Shaniwar Wada & Heritage',
                  '🌦 Real-Time AI Adaptation',
                  '🤝 Verified Local Hosts',
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-block rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-xs border border-white/10"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Trust & Reviews Card */}
            <div className="relative z-10 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/15">
              <div className="flex items-center gap-1 text-[#FFCBA0] mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
                <span className="text-[12px] font-bold text-white ml-1">4.9 / 5.0</span>
              </div>
              <p className="text-[12.5px] text-white/90 italic leading-snug">
                “Travel Saathi helped us discover Kasba Ganpati and Pune street food in 3 hours with real-time weather adaptation.”
              </p>
              <div className="mt-2 text-[11px] font-semibold text-white/70">
                — Verified Traveller Review · Deccan Pune
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E1E6F0] bg-white py-4 text-center text-[12px] text-[#64709A]">
        © 2026 Travel Saathi. All rights reserved. · Safe & verified travel platform
      </footer>
    </div>
  );
}
