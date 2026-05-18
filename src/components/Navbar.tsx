import { Link } from 'react-router-dom';
import { useState } from 'react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200"
                    >
                        CodeCobra
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/"
                            className="text-white/70 hover:text-white transition-colors duration-200"
                        >
                            Home
                        </Link>
                        <Link
                            to="/login"
                            className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-medium"
                        >
                            Login
                        </Link>
                        <Link
                            to="/register"
                            className="px-6 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                        >
                            Register
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden flex flex-col space-y-1.5 w-8 h-8"
                    >
                        <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
                        <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
                        <span className={`block h-0.5 w-full bg-gray-900 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden pb-4 space-y-2">
                        <Link
                            to="/"
                            className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        >
                            Home
                        </Link>
                        <Link
                            to="/login"
                            className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        >
                            Login
                        </Link>
                        <Link
                            to="/register"
                            className="block px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                        >
                            Register
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

