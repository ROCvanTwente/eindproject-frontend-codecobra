import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAuth, setIsAuth] = useState(false);
    const navigate = useNavigate();

    const location = useLocation();
    useEffect(() => {
        setIsAuth(Boolean(localStorage.getItem('token')));
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuth(false);
        navigate('/login');
    };

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
                            to="/dashboard"
                            className="text-gray-700 hover:text-gray-900 transition-colors duration-200 font-medium"
                        >
                            Dashboard
                        </Link>
                        {!isAuth ? (
                            <>
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
                            </>
                        ) : (
                            <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md">Logout</button>
                        )}
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
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        >
                            Home
                        </Link>
                        <Link
                            to="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                        >
                            Dashboard
                        </Link>
                        {!isAuth ? (
                            <>
                                <Link
                                    to="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setIsOpen(false)}
                                    className="block px-4 py-2 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors duration-200"
                                >
                                    Register
                                </Link>
                            </>
                        ) : (
                            <button onClick={() => { setIsOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">Logout</button>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;

