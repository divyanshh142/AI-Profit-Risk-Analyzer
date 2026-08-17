import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Package,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Demand Forecasting',
    description:
      'Predict which products will sell next week so you can stock the right inventory and avoid costly over-ordering.',
  },
  {
    icon: ShieldCheck,
    title: 'Return Risk Scoring',
    description:
      'Identify SKUs with higher return likelihood before they erode your margins, and act early on quality or listing issues.',
  },
  {
    icon: Package,
    title: 'Vendor Reliability',
    description:
      'Track late-delivery patterns by vendor and prioritize partners that keep your customers happy.',
  },
  {
    icon: BarChart3,
    title: 'Profit Insights',
    description:
      'See expected net profit per SKU by combining demand, returns, and shipping costs into one clear view.',
  },
];

export default function LandingPage() {
  return (
    <div className="page-shell">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              PC
            </div>
            <span className="text-base font-semibold text-gray-900">Profit Copilot</span>
          </div>
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-wide text-brand-600">
              AI Profit &amp; Risk Analyzer
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Smarter decisions for every SKU in your catalog
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">
              Profit Copilot helps e-commerce teams forecast demand, reduce returns, evaluate
              vendor performance, and understand product profitability — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="btn-secondary">
                Learn more
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Built for growing product teams</h2>
            <p className="mt-2 text-gray-500">
              Upload your sales data and get actionable insights without a data science team.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="section-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Copilot teaser */}
      <section className="border-t border-gray-100 bg-brand-50/40 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Ask questions in plain English</h2>
          <p className="max-w-lg text-gray-600">
            Our AI Copilot understands your product data. Ask which SKUs are most profitable, which
            categories carry return risk, or where vendor delays are hurting you.
          </p>
          <Link to="/login" className="btn-primary gap-2">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400 sm:px-6">
          &copy; {new Date().getFullYear()} Profit Copilot. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
