import { Link, useNavigate } from "react-router";
import { Github, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import { getStoredToken, login, setAuthSession } from "../../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getStoredToken()) {
      navigate("/app", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      setAuthSession(result.token, result.user);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-r border-white/10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Logo size="md" showText={true} />
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            Welcome back to the future of coding
          </h1>
          
          <p className="text-lg text-gray-300">
            Access your projects from anywhere. Continue where you left off and build something amazing.
          </p>

          <div className="mt-12 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium">Cloud-based workspace</p>
                <p className="text-sm text-gray-400">Code from any device, anywhere</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium">AI-powered assistance</p>
                <p className="text-sm text-gray-400">Get help when you need it</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs">✓</span>
              </div>
              <div>
                <p className="font-medium">Team collaboration</p>
                <p className="text-sm text-gray-400">Work together as a team</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md bg-white/5 border-white/10 p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2">Sign in to codeIT</h2>
            <p className="text-gray-400">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
              </div>
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

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="relative flex justify-center text-sm">
              <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">
                  Forgot password?
              </a>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>


          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#1e1e1e] text-gray-400">Or continue with</span>
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

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}