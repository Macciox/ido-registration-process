import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-secondary">
                Decubate IDO Platform
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <button className="btn btn-primary">
              Login
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;