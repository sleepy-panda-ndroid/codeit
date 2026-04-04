import { Link } from "react-router";
import { 
  Code2, 
  Zap, 
  Sparkles, 
  Users, 
  Cloud, 
  ArrowRight,
  CheckCircle2,
  Github,
  Twitter,
  Linkedin
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Logo } from "../components/Logo";

export default function LandingPage() {
  const features = [
    {
      icon: Code2,
      title: "Browser-based IDE",
      description: "Write, edit, and debug code directly in your browser. No local setup required."
    },
    {
      icon: Zap,
      title: "Multi-language Execution",
      description: "Run code in Python, JavaScript, Java, C++, and more. All in the cloud."
    },
    {
      icon: Sparkles,
      title: "AI Code Assistant",
      description: "Get intelligent code explanations, debugging help, and optimization suggestions."
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Share projects and code with your team. Work together in real-time."
    },
    {
      icon: Cloud,
      title: "Cloud Project Storage",
      description: "All your projects are automatically saved and accessible from anywhere."
    },
    {
      icon: CheckCircle2,
      title: "Access Control",
      description: "Manage permissions with viewer, editor, and admin roles for collaborators."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" showText={true} />

          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent leading-tight">
            codeIT
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Write, run, and collaborate on code directly in your browser.
          </p>

          <div className="flex items-center gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg">
                Sign Up
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Mock IDE Screenshot */}
          <div className="mt-16 mx-auto w-full md:w-4/5 lg:w-3/5 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#1e1e1e]">
            <div className="bg-[#252526] px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-sm text-gray-400 ml-4">main.py</span>
            </div>
            <div className="p-6 text-left font-mono text-sm">
              <div className="space-y-2">
                <div><span className="text-purple-400">def</span> <span className="text-yellow-300">fibonacci</span>(<span className="text-blue-300">n</span>):</div>
                <div className="ml-4"><span className="text-purple-400">if</span> n {"<="} <span className="text-orange-400">1</span>:</div>
                <div className="ml-8"><span className="text-purple-400">return</span> n</div>
                <div className="ml-4"><span className="text-purple-400">return</span> <span className="text-yellow-300">fibonacci</span>(n - <span className="text-orange-400">1</span>) + <span className="text-yellow-300">fibonacci</span>(n - <span className="text-orange-400">2</span>)</div>

                <div className="mt-4"><span className="text-blue-300">num</span> = <span className="text-orange-400">6</span></div>
                <div><span className="text-blue-300">result</span> = <span className="text-yellow-300">fibonacci</span>(num)</div>
                <div><span className="text-yellow-300">print</span>(<span className="text-green-400">f"Fibonacci of {'{'}num{'}'} is {'{'}result{'}'}"</span>)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need to code</h2>
          <p className="text-xl text-gray-400">Powerful features for development teams</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 border-0 p-12 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to start coding?</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers building amazing projects in the cloud
          </p>
          <Link to="/signup">
            <Button className="bg-white text-indigo-600 hover:bg-gray-100 px-8 py-6 text-lg">
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Logo size="sm" showText={true} className="mb-4" />
              <p className="text-gray-400 text-sm">
                The professional cloud IDE for modern developers
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2026 codeIT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}