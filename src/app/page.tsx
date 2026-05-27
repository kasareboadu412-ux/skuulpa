import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">Skooly</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Register Your School
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            School Management{" "}
            <span className="text-blue-600">Built for Ghana</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Admissions, fees, mobile money, attendance, report cards, bus & feeding — 
            everything your private basic school needs in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
            >
              Register Your School — Free Trial
            </Link>
            <Link
              href="/auth/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border p-6 hover:shadow-lg transition">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Skooly. Built for Ghanaian private schools.</p>
      </footer>
    </div>
  );
}

const features = [
  { icon: "📝", title: "Online Admissions", description: "Parents apply from home. Upload documents, pay enrollment fee via MoMo, get instant admission letter." },
  { icon: "💰", title: "Fee Collection", description: "Flexible fee structures with MTN MoMo, Vodafone Cash, AirtelTigo integration. Auto-reconciliation." },
  { icon: "🚌", title: "Bus & Feeding", description: "Manage bus routes, feeding plans, daily attendance, and pro-rated billing. Separate or bundled statements." },
  { icon: "📊", title: "Report Cards", description: "Ghana-format report cards with scores, grades A–F, class position, and teacher remarks. PDF download." },
  { icon: "📱", title: "Parent Portal", description: "View fees, results, attendance, homework. PIN-based login. WhatsApp notifications for everything." },
  { icon: "📋", title: "Attendance & Alerts", description: "Teachers mark attendance. Parents get instant WhatsApp/SMS when child is marked absent." },
  { icon: "👩‍🏫", title: "Teacher Management", description: "Workload dashboard, attendance tracking, performance metrics, document storage with expiry alerts." },
  { icon: "📚", title: "Academic Tracking", description: "Lesson notes, continuous assessment, subject transcripts, class ranking, at-risk student alerts." },
  { icon: "📈", title: "Proprietor Dashboard", description: "One-screen view of fee collection, attendance rates, pass rates, bus utilization. Marketing reports." },
];
