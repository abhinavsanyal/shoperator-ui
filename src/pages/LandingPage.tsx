import { useNavigate } from "react-router-dom";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-white via-[#f8f9ff] to-[#eef2ff] text-gray-800 font-sans">
      <header className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold text-blue-600">
            Shoperator
          </span>
        </div>
        <nav className="hidden md:flex space-x-6 text-gray-600">
          <a href="#" className="text-gray-600 hover:text-gray-800">
            How It Works
          </a>
          <a href="#" className="text-gray-600 hover:text-gray-800">
            Features
          </a>
          <a href="#" className="hover:text-gray-800">
            Pricing
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/sign-in")}
            className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/sign-up")}
            className="px-5 py-2 bg-sky-50 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all duration-200 font-medium"
            style={{ backgroundColor: "#000000" }}
          >
            Sign Up Free
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-600 mb-4">
          Shop Smarter With Shoperator
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mb-8">
          Your autonomous shopping assistant that aggregates data across
          multiple websites, answering complex multi-hop queries and
          streamlining your online shopping experience.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-sky-50 text-white rounded-lg shadow-sm flex items-center space-x-2 hover:bg-blue-700 transition-all duration-200 font-medium"
            style={{ backgroundColor: "#000000" }}
          >
            <span>Start Shopping Smarter</span>
            <ShoppingBagIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/demo")}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200"
          >
            Watch Demo
          </button>
        </div>
      </main>

      <section className="text-center py-16 px-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Smart Shopping Features
        </h1>
        <p className="text-gray-600 mt-4">
          Discover how Shoperator revolutionizes your online shopping
          experience.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="flex items-start p-6 bg-white shadow-md rounded-lg">
            <i className="fas fa-globe text-blue-600 text-2xl mr-4"></i>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Multi-Website Aggregation
              </h3>
              <p className="text-gray-600 mt-2">
                Seamlessly gather product information from multiple e-commerce
                sites in one place.
              </p>
            </div>
          </div>
          <div className="flex items-start p-6 bg-white shadow-md rounded-lg">
            <i className="fas fa-search text-blue-600 text-2xl mr-4"></i>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Intelligent Search
              </h3>
              <p className="text-gray-600 mt-2">
                Answer complex, multi-hop shopping queries with ease and
                accuracy.
              </p>
            </div>
          </div>
          <div className="flex items-start p-6 bg-white shadow-md rounded-lg">
            <i className="fas fa-bolt text-blue-600 text-2xl mr-4"></i>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Autonomous Operation
              </h3>
              <p className="text-gray-600 mt-2">
                Fully automated shopping research that saves you time and
                effort.
              </p>
            </div>
          </div>
          <div className="flex items-start p-6 bg-white shadow-md rounded-lg">
            <i className="fas fa-shield-alt text-blue-600 text-2xl mr-4"></i>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Secure and Private
              </h3>
              <p className="text-gray-600 mt-2">
                Your shopping data is kept safe and confidential at all times.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="text-center py-16 bg-gradient-to-b from-blue-50 to-white">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          Ready to transform your shopping experience?
        </h2>
        <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
          Join thousands of smart shoppers who use Shoperator to save time, find
          the best deals, and make informed purchasing decisions.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 inline-flex items-center space-x-2 px-6 py-3 bg-sky-50 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all duration-200 font-medium"
          style={{ backgroundColor: "#000000" }}
        >
          <span>Get Started for Free</span>
          <ShoppingBagIcon className="h-5 w-5" />
        </button>
      </section>
    </div>
  );
}
