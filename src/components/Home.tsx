const Home = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                        Welcome to <span className="text-black">CodeCobra</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Your modern platform for learning and mastering web development
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/login"
                            className="px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200"
                        >
                            Get Started
                        </a>
                        <a
                            href="#"
                            className="px-8 py-4 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Feature 1 */}
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300">
                        <div className="text-4xl mb-4">🚀</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Fast & Reliable</h3>
                        <p className="text-gray-600">
                            Built with modern technologies for blazing fast performance and reliability
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300">
                        <div className="text-4xl mb-4">📚</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Learn & Master</h3>
                        <p className="text-gray-600">
                            Comprehensive courses and resources to help you master web development
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300">
                        <div className="text-4xl mb-4">🎯</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Achieve Goals</h3>
                        <p className="text-gray-600">
                            Track your progress and achieve your learning goals with our platform
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
