import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Events from '../components/Events';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import ShaderBackground from '../components/ui/shader-background'; 

const Index = () => {
  return (
    // Outer container wrapper
    <div className="relative min-h-screen w-full bg-black text-white overflow-x-hidden">
      
      {/* 1. BACKGROUND LAYER: Fixed to screen, sits at z-0 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ShaderBackground /> 
      </div>

      {/* 2. CONTENT LAYER: Transparent background, sits above at z-10 */}
      <div className="relative z-10 w-full bg-transparent">
        <Navbar />
        <Hero />
        <Events />
        <About />
        <Contact />
        <Footer />
      </div>

    </div>
  );
};

export default Index;