// src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { Eye, EyeOff, Sun, MoonStar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion } from 'framer-motion';

// Ensure we're using a single Three.js instance
if (typeof window !== 'undefined' && !window.THREE) {
  window.THREE = THREE;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
];

// Custom Eye Icon SVG
const CustomEyeIcon = (props) => (
  <svg width="36px" height="36px" viewBox="-102.4 -102.4 1228.80 1228.80" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g>
      <path d="M512 256C326.4 256 160.8 344 55.2 480c-14.4 18.4-14.4 44.8 0 63.2C160.8 680 326.4 768 512 768s351.2-88 456.8-224c14.4-18.4 14.4-44.8 0-63.2C863.2 344 697.6 256 512 256z" fill="#ffffff"/>
      <path d="M512 512m-241.6 0a241.6 241.6 0 1 0 483.2 0 241.6 241.6 0 1 0-483.2 0Z" fill="#6a3974"/>
      <path d="M512 512m-116 0a116 116 0 1 0 232 0 116 116 0 1 0-232 0Z" fill="#00fbff"/>
      <path d="M512 636c-68 0-124-55.2-124-124s56-124 124-124 124 56 124 124-56 124-124 124z m0-232c-59.2 0-108 48-108 108s48 108 108 108 108-48 108-108S571.2 404 512 404z" fill="#3d3e3d"/>
      <path d="M32 512c43.2 64 98.4 118.4 162.4 160.8 39.2-111.2 128-296.8 311.2-416C308.8 258.4 134.4 359.2 32 512z" fill="#ffffff"/>
      <path d="M512 256C312 256 136 357.6 32 512c0 0 469.6-220.8 960 0-104-154.4-280-256-480-256z" fill="#ffffff"/>
      <path d="M512 761.6c-137.6 0-249.6-112-249.6-249.6s112-249.6 249.6-249.6 249.6 112 249.6 249.6-112 249.6-249.6 249.6z m0-483.2c-128.8 0-233.6 104.8-233.6 233.6S383.2 745.6 512 745.6 745.6 640.8 745.6 512 640.8 278.4 512 278.4z" fill="#3d3e3d"/>
      <path d="M512 636c-68 0-124-55.2-124-124s56-124 124-124 124 56 124 124-56 124-124 124z m0-232c-59.2 0-108 48-108 108s48 108 108 108 108-48 108-108S571.2 404 512 404z" fill="#3d3e3d"/>
      <path d="M512 776c-4.8 0-8-3.2-8-8s3.2-8 8-8c177.6 0 341.6-80.8 451.2-220.8 12-16 12-37.6 0-53.6C853.6 344.8 689.6 264 512 264c-4.8 0-8-3.2-8-8s3.2-8 8-8c182.4 0 351.2 83.2 463.2 227.2 16.8 21.6 16.8 51.2 0 72.8C863.2 692.8 694.4 776 512 776z" fill="#3d3e3d"/>
      <path d="M512 776C329.6 776 160.8 692.8 48.8 548.8a58.88 58.88 0 0 1 0-72.8C160.8 331.2 329.6 248 512 248c4.8 0 8 3.2 8 8s-3.2 8-8 8C334.4 264 170.4 344.8 60.8 485.6c-12 16-12 37.6 0 53.6C170.4 679.2 334.4 760 512 760c4.8 0 8 3.2 8 8s-3.2 8-8 8z" fill="#3d3e3d"/>
    </g>
  </svg>
);

{/*const originalEyeIcon = ((
  <svg 
    width="22" 
    height="22" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{
      transition: 'transform 0.3s ease',
      transform: 'rotate(0deg)',
    }}
  >
    // Eye outline  
    <path 
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" 
      fill="currentColor"
      style={{
        transition: 'opacity 0.3s ease',
        opacity: showPassword ? 0 : 1,
      }}
    />
    // Diagonal line 
    <line 
      x1="3" 
      y1="21" 
      x2="21" 
      y2="3" 
      stroke="currentColor" 
      strokeWidth="2"
      style={{
        transition: 'opacity 0.3s ease',
        opacity: showPassword ? 0 : 1,
      }}
    />
  </svg>
)*/}


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const logoUrl = '/logoIcons/logo.png';
  const { darkMode, toggleDarkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 767);
  const [aspectRatio, setAspectRatio] = useState(window.innerWidth / window.innerHeight);
  const { t, i18n } = useTranslation();
  
  // Three.js refs
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const animationsRef = useRef([]);
  const currentAnimationIndexRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const controlsRef = useRef(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera with 360-degree initial angle for better model view
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(4, 2, -4); // Position camera at 135-degree angle (side-back view)
    camera.lookAt(0, 1, 0);

    // Renderer with enhanced settings for emissive materials
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      alpha: true, 
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor (0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 5; // Adjusted for better emissive visibility
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.physicallyCorrectLights = true;
    renderer.useLegacyLights = false;
    
    // Enable better texture handling
    renderer.capabilities.isWebGL2 = true;
    renderer.capabilities.precision = 'highp';
    
    rendererRef.current = renderer;

    // Add OrbitControls for camera interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.maxDistance = 20;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Enhanced Lighting Setup with Emissive Support
    // Strong ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xbcbcbc, 0.8);
    scene.add(ambientLight);

    // Main directional light for primary illumination
    const directionalLight = new THREE.DirectionalLight(0xbcbcbc, 1.5);
    directionalLight.position.set(3, 5, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Front fill light for better visibility
    const frontLight = new THREE.DirectionalLight(0x057eff, 0.8);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    // Top light for enhanced illumination
    const topLight = new THREE.DirectionalLight(0x6d6d6d, 1.2);
    topLight.position.set(0, -10, 0);
    scene.add(topLight);

    // Warm accent light for emissive materials
    const warmLight = new THREE.PointLight(0xffffff, 1.5, 20);
    warmLight.position.set(-2, 1, 2);
    scene.add(warmLight);

    // Cool accent light for emissive materials
    const coolLight = new THREE.PointLight(0xffffff, 1.5, 20);
    coolLight.position.set(2, 1, -2);
    scene.add(coolLight);

    // Subtle rim light for better definition
    const rimLight = new THREE.DirectionalLight (0xffffff, 1);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    // Add subtle volumetric lighting effect
    const volumetricLight = new THREE.PointLight(0x6d6d6d, 0.8, 15);
    volumetricLight.position.set(0, 0, 0);
    scene.add(volumetricLight);

    // Load the model
    const loader = new GLTFLoader();
    loader.load(
      '/3d_models/robot.glb',
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        
        // Center and scale the model - 15% larger on desktop
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const baseScale = 4 / maxDim;
        const desktopScale = window.innerWidth > 768 ? baseScale * 1.25 : baseScale; // 15% larger on desktop
        
        model.scale.setScalar(desktopScale);
        model.position.sub(center.multiplyScalar(desktopScale));
        
        // Enable shadows and ensure materials are properly rendered with emissive support
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Ensure materials are properly configured
            if (child.material) {
              // Enable proper material rendering
              child.material.needsUpdate = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
              
              // Fix texture format issues and ensure proper color space
              if (child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
                child.material.map.needsUpdate = true;
                child.material.map.format = THREE.RGBAFormat;
                child.material.map.type = THREE.UnsignedByteType;
              }
              
              // Handle emissive textures and maps
              if (child.material.emissiveMap) {
                child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                child.material.emissiveMap.needsUpdate = true;
                child.material.emissiveMap.format = THREE.RGBAFormat;
                child.material.emissiveMap.type = THREE.UnsignedByteType;
              }
              
              // Set emissive intensity for better glow effect
              if (child.material.emissive) {
                child.material.emissiveIntensity = 0.5; // Adjust this value for glow intensity
                child.material.emissive.convertSRGBToLinear();
              }
              
              // If material has color, ensure it's properly set
              if (child.material.color) {
                child.material.color.convertSRGBToLinear();
              }
              
              // Enable emissive rendering only for glowing parts
              if (child.name.toLowerCase().includes('eye') || 
                  child.name.toLowerCase().includes('light') ||
                  child.name.toLowerCase().includes('glow')) {
                child.material.emissiveIntensity = 1;
              } else {
                // For body parts, ensure they're not emissive and have proper color
                child.material.emissiveIntensity = 1;
                child.material.emissive = new THREE.Color(0x000000);
                child.material.metalness = 0.35;
                child.material.roughness = 1;
              }
              
              // Fix for WebGL texture format warnings
              if (child.material.normalMap) {
                child.material.normalMap.format = THREE.RGBAFormat;
                child.material.normalMap.type = THREE.UnsignedByteType;
              }
              
              if (child.material.roughnessMap) {
                child.material.roughnessMap.format = THREE.RGBAFormat;
                child.material.roughnessMap.type = THREE.UnsignedByteType;
              }
              
              if (child.material.metalnessMap) {
                child.material.metalnessMap.format = THREE.RGBAFormat;
                child.material.metalnessMap.type = THREE.UnsignedByteType;
              }
            }
          }
        });
        
        scene.add(model);

        // Add emissive glow effects to the model
        addEmissiveGlow(model);

        // Debug: Log material information
        console.log('Model loaded with materials:');
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            console.log('Mesh:', child.name, 'Material:', child.material);
            if (child.material.color) {
              console.log('Color:', child.material.color);
            }
            if (child.material.map) {
              console.log('Texture map:', child.material.map);
            }
            if (child.material.emissive) {
              console.log('Emissive:', child.material.emissive);
            }
          }
        });

        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixerRef.current = mixer;
          animationsRef.current = gltf.animations;
          
          console.log('Loaded animations:', gltf.animations.map(anim => anim.name));
          
          // Start playing the first animation
          playNextAnimation();
        }

        setIsLoading(false);
      },
      (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
        setIsLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Only render if renderer and scene are available
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // Update controls on resize
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      // Clean up materials and textures
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child.isMesh && child.material) {
            if (child.material.map) {
              child.material.map.dispose();
            }
            child.material.dispose();
          }
        });
      }
      
      renderer.dispose();
    };
  }, []);

  // Create emissive material helper function
  const createEmissiveMaterial = (baseColor = 0x00ffff, intensity = 0.75) => {
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: baseColor,
      emissiveIntensity: intensity,
      metalness: 0.1,
      roughness: 0.8,
    });
    return material;
  };

  // Add emissive glow effect to specific parts
  const addEmissiveGlow = (model) => {
    model.traverse((child) => {
      if (child.isMesh) {
        // Add emissive glow to eyes or specific parts
        if (child.name.toLowerCase().includes('eye') || 
            child.name.toLowerCase().includes('light') ||
            child.name.toLowerCase().includes('glow')) {
          
          // Create emissive material for glowing parts
          const emissiveMaterial = createEmissiveMaterial(0x00ffff, 0.5);
          child.material = emissiveMaterial;
          
          // Add subtle animation to the glow
          const originalIntensity = emissiveMaterial.emissiveIntensity;
          let time = 0;
          const animateGlow = () => {
            time += 0.02;
            emissiveMaterial.emissiveIntensity = originalIntensity + Math.sin(time) * 0.1;
            requestAnimationFrame(animateGlow);
          };
          animateGlow();
        }
      }
    });
  };

  // Play animations in sequence
  const playNextAnimation = () => {
    if (!mixerRef.current || animationsRef.current.length === 0) return;

    // Stop current animation
    mixerRef.current.stopAllAction();

    // Play next animation
    const animation = animationsRef.current[currentAnimationIndexRef.current];
    const action = mixerRef.current.clipAction(animation);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();

    console.log(`Playing animation: ${animation.name}`);

    // Listen for animation completion
    const onFinished = () => {
      currentAnimationIndexRef.current = (currentAnimationIndexRef.current + 1) % animationsRef.current.length;
      setTimeout(playNextAnimation, 1000); // 1 second delay between animations
    };

    // Check if animation is finished
    const checkFinished = () => {
      if (action.isRunning()) {
        requestAnimationFrame(checkFinished);
      } else {
        onFinished();
      }
    };
    checkFinished();
  };
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
      setAspectRatio(window.innerWidth / window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Typing animation for title
  useEffect(() => {
    const text = t('login.title');
    let i = 0;
    setTypedText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 110);
    return () => clearInterval(interval);
  }, [t]);

  // GSAP slide-in animation
  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.2 }
    );
    gsap.fromTo(
      modelRef.current,
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.45 }
    );
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/'; // or use navigate('/')
  };

  const [logoRotation, setLogoRotation] = useState(0);
  const [logoDirection, setLogoDirection] = useState(1); // 1 for 360, -1 for -360
  

  useEffect(() => {
    let timeout;
    if (logoDirection === 1) {
      setLogoRotation(360);
      timeout = setTimeout(() => {
        setLogoDirection(-1);
      }, 2000 + 50); // 2s for rotation + 0.25s pause
    } else {
      setLogoRotation(-360);
      timeout = setTimeout(() => {
        setLogoDirection(1);
      }, 2000 + 50); // 2s for rotation + 1s pause
    }
    return () => clearTimeout(timeout);
  }, [logoDirection]);


    return (
    <>
      <div style={{
        width: '85vw',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '2rem' : 'clamp(1rem, 4vw, 2rem)',
        gap: 'clamp(1rem, 4vw, 2rem)',
        position: 'relative',
      }}>
        {/* Theme Toggle Button for mobile - visually overlapping the card's top left by ~5px */}
        {isMobile && (
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            style={{
              position: 'absolute',
              top: 'calc(50% - 210px - 25px)',
              left: 'calc(50% - 210px + 25px)',
              width: 40,
              height: 28,
              borderRadius: 14,
              border: '1.5px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              background: darkMode ? '#232b3b' : '#ffffff',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 100,
              outline: 'none',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: darkMode ? 18 : 4,
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'var(--theme-toggle-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                fontSize: '1.1rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
                zIndex: 2,
              }}
            >
              <motion.div
                animate={{ rotate: darkMode ? 225 : 0 }}
                transition={{ duration: 0.5, ease: 'linear' }}
                style={{ position: 'relative', top: darkMode ? '-1.5px' : '3px' }}
              >
                {darkMode ? <MoonStar size={16} /> : <Sun size={16} />}
              </motion.div>
            </span>
          </button>
        )}
        {/* Theme Toggle Button for desktop - above login card, left-aligned */}
        {!isMobile && (
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            style={{
              position: 'absolute',
              left: '32.5%',
              top: 'calc(35vh - 40px)',
              width: 56,
              height: 32,
              background: 'var(--card-bg)',
              borderRadius: 16,
              border: '1.5px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              zIndex: 200,
              outline: 'none',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: darkMode ? 26 : 4,
                transform: 'translateY(-50%)',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--theme-toggle-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                fontSize: '1.2rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'left 1.75s cubic-bezier(.4,2.2,.2,1), background 0.2s',
                zIndex: 2,
              }}
            >
               {/* Animated Sun/Moon icon */}
               <motion.div 
                style={{ 
                  position: 'relative', 
                  top: isMobile ? '0px' : darkMode ? '-1.5px' : '3px'
                }}
                animate={{ rotate: darkMode ? 225 : 0 }}
                transition={{ duration: 0.5, ease: "linear" }}
              >
                {darkMode ? <MoonStar size={isMobile ? 12 : 24} /> : <Sun size={isMobile ? 12 : 24} />}
              </motion.div>
            </span>
          </button>
        )}
        {/* Login Card */}
        <div
          ref={cardRef}
          style={{
            flex: 1,
            border: '1.5px solid var(--card-border)',
            borderRadius: '12px',
            padding: 'clamp(0.75rem, 2vw, 1.5rem)',
            width: '100%',
            maxWidth: isMobile ? '100vw' : 'clamp(280px, 95vw, 550px)',
            boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginTop: '15vh', 
          }}
        >
          <h2 style={{
            textAlign: 'center',
            marginBottom: 'clamp(1rem, 4vw, 2rem)',
            color: 'var(--text)',
            fontSize: 'clamp(1.2rem, 5vw, 2rem)',
            fontWeight: '600',
            minHeight: '2.5rem',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}>
            {typedText}
            {/* Blinking cursor only while typing */}
            {typedText.length < 10 && (
              <span style={{
                display: 'inline-block',
                width: '1ch',
                color: 'var(--primary)',
                animation: 'blink 1s steps(1) infinite',
                fontWeight: 700,
              }}>|</span>
            )}
            {/* Show logo during typing and after */}
            <motion.img
              onClick={() => window.location.href = 'https://icue.vn'}
              src={logoUrl}
              alt="Logo"
              animate={{ rotate: logoRotation }}
              transition={{
                duration: 2,
                ease: 'linear',
              }}
              style={{
                cursor: 'pointer',
                height: '2.2rem',
                width: 'auto',
                marginLeft: '0.5rem',
                verticalAlign: 'middle',
                display: 'inline-block',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          </h2>
          
          {/* Language Switcher */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{ position: 'relative', minWidth: 120 }}>
              <button className="btn-hover-preview"
                onClick={() => setShowLanguageDropdown((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={showLanguageDropdown}
                title={t('login.languageSelector')}
                style={{
                  fontSize: 'clamp(0.675rem, 2.5vw, 0.925rem)',
                  borderRadius: '8px',
                  border: '1.5px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  minWidth: 100,
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--card-border)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <span>
                  {LANGUAGES.find(l => l.code === i18n.language)?.flag} {LANGUAGES.find(l => l.code === i18n.language)?.label}
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>▼</span>
              </button>
              {showLanguageDropdown && (
                <ul
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    width: '100%',
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--card-border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    zIndex: 22,
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    overflow: 'hidden',
                    opacity: 1,
                    transform: 'translateY(0)',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                  }}
                  role="listbox"
                  aria-activedescendant={i18n.language}
                >
                    {LANGUAGES.map(lang => (
                      <li
                        key={lang.code}
                        role="option"
                        aria-selected={i18n.language === lang.code}
                        tabIndex={0}
                        onClick={() => {
                          i18n.changeLanguage(lang.code);
                          setShowLanguageDropdown(false);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            i18n.changeLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }
                        }}
                        style={{
                          fontSize: 'clamp(0.675rem, 2.5vw, 0.925rem)',
                          padding: '0.6rem 1rem',
                          cursor: 'pointer',
                          background: i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)',
                          color: 'var(--text)',
                          fontWeight: i18n.language === lang.code ? 600 : 400,
                          borderBottom: '1px solid var(--card-border)',
                          outline: 'none',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)'}
                      >
                        <span style={{ marginRight: 8 }}>{lang.flag}</span> {lang.label}
                      </li>
                    ))}
                </ul>
              )}
              {/* Click outside to close */}
              {showLanguageDropdown && (
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                  onClick={() => setShowLanguageDropdown(false)}
                  tabIndex={-1}
                />
              )}
            </div>
          </div>
          
          <form onSubmit={handleLogin} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem',
            width: '100%',
          }}>
            <div>
              <input 
                type="email" 
                placeholder={t('login.email')} 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                required 
                style={{
                  backgroundColor: darkMode ? '#fbfffe' : '#e7fffc',
                  width: '100%',
                  maxWidth: '92.5%',
                  padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                  color: 'var(--login-input-text)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--card-border)';
                  e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              />
            </div>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.password')} 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{
                  backgroundColor: darkMode ? '#fbfffe' : '#e7fffc',
                  width: '100%',
                  maxWidth: '92.5%',
                  padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                  color: 'var(--login-input-text)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--card-border)';
                  e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '2.5%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  border: 'none',
                  borderRadius: '50%',
                  padding: '2px',
                  cursor: 'pointer',
                  margin: 0,
                  color: 'var(--eye-icon)',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '32px',
                  width: '32px',
                }}
                tabIndex={0}
              >
                <motion.div
                  animate={{ rotate: showPassword ? 360 : 0, scale: showPassword ? 1.25 : 1 }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                  style={{ position: 'relative', width: 36, height: 36 }}
                >
                  <CustomEyeIcon />
                  <svg
                    width="22"
                    height="22"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                    }}
                  >
                    <motion.line
                      x1="3"
                      y1="21"
                      x2="21"
                      y2="3"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ opacity: showPassword ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </svg>
                </motion.div>
              </button>
            </div>
            
            <button 
              type="submit"
              className="fancy-btn"
              style={{
                width: '100%',
                fontSize: 'clamp(0.95rem, 2vw, 1rem)',
                fontWeight: 600,
                marginTop: '0.5rem',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {t('login.loginButton')}
            </button>
            
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}>
                {t('login.error')}
              </div>
            )}
          </form>
        </div>

        {/* 3D Model */}
        <div
         ref={modelRef}
         style={{
           pointerEvents: isMobile ? 'none' : 'auto',
           position: 'absolute',
           top: isMobile ? '5%' : -75,
           left: isMobile ? '10%' : 0,
           right: isMobile ? '10%' : 0,
           margin: 'auto',
           minWidth: isMobile ? 240 : 280,
           maxWidth: isMobile ? 360 : 400,
           height: isMobile ? 450 : 500,
           display: isMobile && aspectRatio > 0.72 ? 'none' : (isMobile ? 'block' : 'flex'),
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 100, 
         }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: isMobile ? 'block' : 'block',
              width: isMobile ? '90%' : '100%',
              height: isMobile ? '90%' : '100%',
              borderRadius: '12px',
              background: 'transparent',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Login;
