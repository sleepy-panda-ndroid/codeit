import { Link, useNavigate } from "react-router";
import { Github, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import { getStoredToken, setAuthSession, signup } from "../../lib/auth";

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getStoredToken()) {
      navigate("/app", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signup(name.trim(), email.trim(), password);
      setAuthSession(result.token, result.user);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-r border-white/10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Logo size="md" showText={true} />
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            Start your coding journey today
          </h1>
          
          <p className="text-lg text-gray-300">
            Join thousands of developers who build projects directly from the browser.
          </p>

          <div className="mt-12 space-y-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-indigo-400 mb-1">100% Free</p>
              <p className="text-sm text-gray-400">No credit card required to get started</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-purple-400 mb-1"> No Local Storage</p>
              <p className="text-sm text-gray-400">Create and manage projects online</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-teal-400 mb-1">Collaboration</p>
              <p className="text-sm text-gray-400">Collaborate with your team</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-pink-400 mb-1">AI Assistant</p>
              <p className="text-sm text-gray-400">Get intelligent coding help</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md bg-white/5 border-white/10 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">Create your account</h2>
            <p className="text-gray-400">Get started with codeIT</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1e1e1e] text-gray-400">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <Github className="w-5 h-5 mr-2" />
              GitHub
            </Button>
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <Mail className="w-5 h-5 mr-2" />
              Google
            </Button>
          </div>

          <p className="mt-6 text-xs text-center text-gray-500">
            By signing up, you agree to our{" "}
            <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>
          </p>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}