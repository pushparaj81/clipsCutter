import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full mt-auto mb-0">
      {/* Links Section */}
      <div className="bg-black px-8 sm:px-16 lg:px-32 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-x-32 gap-y-4">
          {/* Left Column */}
          <div className="space-y-4">
            <Link href="/privacy-policy" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Terms of service
            </Link>
            <Link href="/disclaimer" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Disclaimer
            </Link>
            <Link href="/refund-policy" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Refund Policy
            </Link>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <Link href="/contact" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Contact Us
            </Link>
            <Link href="/feedback" className="block text-sm text-gray-300 hover:text-white transition-colors">
              Feedback
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bg-black py-3 text-center">
        <p className="text-white text-sm font-medium tracking-wide">
          MagicCutter.com® | Copyright 2026. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
