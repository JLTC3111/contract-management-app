// src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supaBaseClient';
import { useTheme } from '../hooks/useTheme';
import { useUser } from '../hooks/useUser';
import { Sun, MoonStar, ChevronDownIcon, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion } from 'framer-motion';

// Ensure we're using a single Three.js instance
if (typeof window !== 'undefined' && !window.THREE) {
  window.THREE = THREE;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '/flags/gb.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
  { code: 'es', label: 'Español', flag: '/flags/es.svg' },
  { code: 'ja', label: '日本語', flag: '/flags/jp.svg' },
  { code: 'th', label: 'ไทย', flag: '/flags/th.svg' },
  { code: 'zh', label: '中文', flag: '/flags/cn.svg' },
  { code: 'vi', label: 'Tiếng Việt', flag: '/flags/vn.svg' },
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
  const { enableDemoMode } = useUser();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 767);
  const [aspectRatio, setAspectRatio] = useState(window.innerWidth / window.innerHeight);
  const { t, i18n } = useTranslation();

  // Handle demo mode activation
  const handleTryDemo = () => {
    enableDemoMode();
    navigate('/');
  };
  const dropdownRef = useRef(null);
  const langSwitcherRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langSwitcherRef.current && !langSwitcherRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showLanguageDropdown]);
  
  // Three.js refs
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const mixerRef = useRef(null);
  const modelRef = useRef(null);
  const animationsRef = useRef([]);
  const currentAnimationIndexRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const controlsRef = useRef(null);
  const [lang, setLang] = useState(i18n.language);

  useEffect(() => {
    const onLangChange = (lng) => setLang(lng);
    i18n.on('languageChanged', onLangChange);
    return () => i18n.off('languageChanged', onLangChange);
  }, []);


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
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/'); // Path to the DRACO decoder files
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      '/3d_models/retro_computer.glb',
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
        
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (child.material) {
              child.material.needsUpdate = true;
              child.material.transparent = false;
              child.material.opacity = 1.0;
              
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
              
              if (child.material.color) {
                child.material.color.convertSRGBToLinear();
              }
              
              if (child.name.toLowerCase().includes('eye') || 
                  child.name.toLowerCase().includes('light') ||
                  child.name.toLowerCase().includes('glow')) {
                child.material.emissiveIntensity = 1;
              } else {
                child.material.emissiveIntensity = 1;
                child.material.emissive = new THREE.Color(0x000000);
                child.material.metalness = 0.35;
                child.material.roughness = 1;
              }
              
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
        
        // Animations 
        if (gltf.animations && gltf.animations.length > 0) {
          const filteredAnimations = gltf.animations.filter(anim => anim.name !== 'jump');
          const mixer = new THREE.AnimationMixer(model);
          // const filteredAnimations = gltf.animations.slice(1);
          mixerRef.current = mixer;
          animationsRef.current = filteredAnimations;
          
          console.log('Loaded animations:', gltf.animations.map(anim => anim.name));
          
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
  const [logoSpeed, setLogoSpeed] = useState(2);

  useEffect(() => {
    let timeout;
    if (logoDirection === 1) {
      setLogoRotation(360);
      timeout = setTimeout(() => {
        setLogoDirection(-1);
      }, 2000 + 250); //Timeout to pause (not spinning duration)
    } else {
      setLogoRotation(-255);
      timeout = setTimeout(() => {
        setLogoDirection(1);
      }, 4000 + 50); //Timeout to pause (not spinning duration)
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
        padding: isMobile ? '2rem' : 'clamp(2rem, 10vw, 4.5rem)',
        gap: 'clamp(1rem, 4vw, 2rem)',
        position: 'relative',
      }}>
        {/* Login Card */}
        <div
          ref={cardRef}
          style={{
            flex: 1,
            border: '1.5px solid var(--card-border)',
            borderRadius: '16px',
            padding: isMobile ? '1.5rem' : '2rem 2.5rem',
            width: '100%',
            maxWidth: isMobile ? '100vw' : 'clamp(320px, 90vw, 420px)',
            boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            marginTop: isMobile ? '15vh' : '35vh', 
          }}
        >
          <h2 style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: 'var(--text)',
            fontSize: 'clamp(1.4rem, 5vw, 1.75rem)',
            fontWeight: '600',
            minHeight: '2.5rem',
            letterSpacing: '1px',
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
              transition={{ duration: 4, ease: [0.7, -0.5, 0.3, 0.1] }}
              style={{
                cursor: 'pointer',
                height: '2.2rem',
                width: 'auto',
                marginLeft: '0.5rem',
                verticalAlign: 'middle',
                display: 'inline-block',
                objectFit: 'contain',
                filter: 'drop-shadow(0px 0px 12px rgba(255, 255, 255, 0.1))',
              }}
            />
          </h2>
          
          {/* Language Switcher & Theme Toggle Row */}
          <div style={{ 
            width: '100%', 
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}>
            {/* Language Switcher */}
            <div ref={langSwitcherRef} style={{ position: 'relative', flex: 1, maxWidth: '180px' }}>
              <button 
                className="btn-hover-preview"
                onClick={() => setShowLanguageDropdown((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={showLanguageDropdown}
                title={t('login.languageSelector')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s, border-color 0.2s',
                  height: '38px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                  <img 
                    src={LANGUAGES.find(l => l.code === i18n.language)?.flag}
                    alt={LANGUAGES.find(l => l.code === i18n.language)?.label}
                    style={{ width: '1.25em', height: '1.25em', objectFit: 'contain' }}
                  />
                  <span style={{ flexGrow: 1, fontSize: '0.875rem' }}>{LANGUAGES.find(l => l.code === i18n.language)?.label}</span>
                  <ChevronDownIcon size={14} />
                </span>
              </button>

              {showLanguageDropdown && (
                <ul
                  ref={dropdownRef}
                  role="listbox"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    listStyle: 'none',
                    padding: 0,
                    margin: '0.25rem 0 0 0',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    WebkitOverflowScrolling: 'touch',
                  }}
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
                            e.preventDefault();
                            i18n.changeLanguage(lang.code);
                            setShowLanguageDropdown(false);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          background: i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)',
                          color: 'var(--text)',
                          fontWeight: i18n.language === lang.code ? 600 : 400,
                          borderBottom: '1px solid var(--card-border)',
                          outline: 'none',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = i18n.language === lang.code ? 'var(--hover-bg)' : 'var(--card-bg)'}
                      >
                        <img 
                          src={lang.flag} 
                          alt={lang.label} 
                          style={{ width: '1.25em', height: '1.25em', objectFit: 'contain' }}
                        />
                        <span>{lang.label}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? t('buttons.light') : t('buttons.dark')}
              title={darkMode ? t('buttons.light') : t('buttons.dark')}
              style={{
                width: 52,
                height: 38,
                background: 'var(--input-bg)',
                borderRadius: '8px',
                border: '1px solid var(--input-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <motion.div 
                animate={{ rotate: darkMode ? 360 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                {darkMode ? <MoonStar size={18} /> : <Sun size={18} />}
              </motion.div>
            </button>
          </div>
          
          <form onSubmit={handleLogin} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
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
                  WebkitBoxShadow: '0 0 0px 1000px ' + (darkMode ? '#fbfffe' : '#e7fffc') + ' inset', 
                  backgroundColor: darkMode ? '#fbfffe' : '#e7fffc',
                  width: '100%',
                  maxWidth: '100%',
                  padding: '0.75rem 1rem',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: 'var(--login-input-text)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  height: '48px',
                  boxSizing: 'border-box',
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
                  WebkitBoxShadow: '0 0 0px 1000px ' + (darkMode ? '#fbfffe' : '#e7fffc') + ' inset', 
                  backgroundColor: darkMode ? '#fbfffe' : '#e7fffc',
                  width: '100%',
                  maxWidth: '100%',
                  padding: '0.75rem 3rem 0.75rem 1rem',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: 'var(--login-input-text)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  height: '48px',
                  boxSizing: 'border-box',
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
                  right: '12px',
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
                  animate={{ rotate: showPassword ? 360 : 0, scale: showPassword ? 1.15 : 1 }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                  style={{ position: 'relative', width: 32, height: 32 }}
                >
                  <CustomEyeIcon style={{ width: 32, height: 32 }} />
                  <svg
                    width="20"
                    height="20"
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
                      y1="17"
                      x2="17"
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
                fontSize: '0.95rem',
                fontWeight: 600,
                marginTop: '0.5rem',
                transition: 'transform 0.2s',
                height: '48px',
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

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: '0.25rem 0',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('login.or', 'or')}</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
            </div>

            {/* Try Demo Button */}
            <button 
              type="button"
              onClick={handleTryDemo}
              style={{
                width: '100%',
                fontSize: '0.9rem',
                fontWeight: 500,
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: `1.5px solid ${darkMode ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
                borderRadius: '8px',
                color: darkMode ? '#60a5fa' : '#3b82f6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                height: '48px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = darkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.borderColor = darkMode ? '#60a5fa' : '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = darkMode ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Play size={16} />
              {t('login.tryDemo', 'Try Demo Mode')}
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
           pointerEvents: 'auto',
           position: 'absolute',
           top: isMobile ? '-5%' : -15,
           left: isMobile ? '15%' : 0,
           right: isMobile ? '10%' : 0,
           margin: 'auto',
           minWidth: isMobile ? 220 : 280,
           maxWidth: isMobile ? 360 : 430,
           height: 350,
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
              width: isMobile ? '100%' : '100%',
              height: isMobile ? '100%' : '100%',
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
