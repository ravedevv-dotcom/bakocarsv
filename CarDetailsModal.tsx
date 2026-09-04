/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, MouseEvent } from 'react';
import { X, CheckCircle2, ChevronLeft, ChevronRight, Share2, MessageCircle, Phone, Maximize2, Video, Film, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { Car, Inquiry, getImageUrl, getVideoUrl, handleImageFallback } from './types';

interface CarDetailsModalProps {
  car: Car | null;
  onClose: () => void;
  onSubmitInquiry: (inquiry: Omit<Inquiry, 'id' | 'dateSubmitted' | 'status'>) => void;
  initialInquiryType?: 'Inquiry' | 'Test Drive' | 'Finance Quote' | 'Trade-In';
}

export default function CarDetailsModal({ car, onClose, onSubmitInquiry }: CarDetailsModalProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Touch gesture state for hand swipes
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && car && car.images.length > 1) {
        setActiveImageIdx((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight' && car && car.images.length > 1) {
        setActiveImageIdx((prev) => (prev + 1) % car.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, car, onClose]);

  useEffect(() => {
    if (car) {
      setActiveImageIdx(0);
      setIsVideoMode(car.images.length === 0 && Boolean(car.videoUrl));
    }
  }, [car]);

  if (!car) return null;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?carId=${car.id}`;
    const shareData = {
      title: `${car.year} ${car.make} ${car.model} | Bako Cars`,
      text: `Check out this ${car.year} ${car.make} ${car.model} at Bako Cars of Abuja!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Could not copy link:', err);
      }
    }
  };

  const formatCurrency = (val: number) => {
    if (!val || val <= 0) return 'INQUIRE FOR PRICE';
    return '₦' + new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatMileage = (miles: number | null) => {
    if (miles === null || miles === undefined) return 'N/A';
    if (miles <= 0) return 'BRAND NEW';
    return new Intl.NumberFormat('en-US').format(miles);
  };

  const handlePrevImage = () => {
    setActiveImageIdx((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % car.images.length);
  };

  // Touch handlers for mobile hand scrolling/swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent, isLightbox: boolean = false) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 35) {
        if (diffX > 0) {
          handleNextImage();
        } else {
          handlePrevImage();
        }
      }
    } else {
      if (diffY < -80) {
        if (isLightbox) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const waInquiryUrl = `https://wa.me/message/JCOUM7I4Z2XVB1?text=${encodeURIComponent(
    `Hello Bako Cars, I am inquiring about the ${car.year} ${car.make} ${car.model} (Stock #: ${car.stockNumber || '10601'}). Is this vehicle available?`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
      id="car-details-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.98, y: 15 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.98, y: 15 }}
        transition={{ type: 'spring', damping: isMobile ? 32 : 25, stiffness: isMobile ? 220 : 120 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#0A0A0A] border-t md:border border-neutral-800 w-full max-w-7xl rounded-t-2xl md:rounded-lg overflow-hidden shadow-2xl flex flex-col h-[94vh] md:h-auto md:max-h-[92vh] text-white"
        id="car-details-modal-box"
      >
        {/* Mobile Pull-Down Bar */}
        <div
          className="w-16 h-1 bg-neutral-600 hover:bg-white rounded-full mx-auto my-2 cursor-pointer md:hidden shrink-0"
          onClick={onClose}
          title="Swipe down or tap to exit"
        />

        {/* Top Header Actions Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-800 bg-[#0F0F0F] shrink-0">
          {/* Brand Badge */}
          <div className="flex items-center space-x-2">
            <span className="font-serif italic font-extrabold text-sm text-white tracking-wider">BAKO CARS</span>
            <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest">• ABUJA</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={waInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-neutral-700 hover:border-emerald-500 bg-neutral-900 text-emerald-400 rounded transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>

            <button
              onClick={handleShare}
              className={`p-2 border rounded transition-colors space-x-1 flex items-center font-mono text-[10px] font-bold ${
                copied
                  ? 'bg-emerald-500 border-emerald-500 text-black'
                  : 'border-neutral-700 hover:border-white bg-neutral-900 text-white'
              }`}
              title="Share Vehicle"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Scroll Workspace */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 flex-grow space-y-6">
          
          {/* Header Title Bar */}
          <div>
            <div className="font-mono text-[11px] font-bold uppercase text-neutral-400 tracking-[0.2em] mb-1">
              {car.year} {car.make}
            </div>
            <h1 className="font-sans text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              {car.model}
            </h1>
          </div>

          {/* 2-Column Responsive Layout (Laptop left media, right specs & CTAs) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT COLUMN: Gallery & Vehicle Description */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Media Viewport Header / Mode Switcher */}
              {car.videoUrl && (
                <div className="flex items-center space-x-2 pb-1 border-b border-white/10">
                  {car.images.length > 0 && (
                    <button
                      onClick={() => setIsVideoMode(false)}
                      className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                        !isVideoMode
                          ? 'bg-white text-black font-extrabold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>PHOTO GALLERY ({car.images.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsVideoMode(true)}
                    className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isVideoMode || car.images.length === 0
                        ? 'bg-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20'
                        : 'bg-neutral-900 text-amber-400 border border-amber-500/30 hover:bg-neutral-800'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>MAIN VIDEO REEL</span>
                  </button>
                </div>
              )}

              {/* Main Media Viewport */}
              <div className="space-y-3">
                <div 
                  className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900 rounded-lg border border-neutral-800 group cursor-zoom-in"
                  onClick={() => !isVideoMode && car.images.length > 0 && setIsLightboxOpen(true)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, false)}
                >
                  {/* Watermark in Top Right */}
                  <div className="absolute top-3 right-3 z-10 pointer-events-none select-none text-right">
                    <span className="font-serif italic font-extrabold text-[14px] text-black tracking-tight drop-shadow-sm block leading-none">
                      BAKO CARS
                    </span>
                    <span className="font-sans text-[8px] text-black font-extrabold uppercase tracking-[0.2em] block mt-0.5">
                      ABUJA
                    </span>
                  </div>

                  {(isVideoMode && car.videoUrl) || car.images.length === 0 ? (
                    car.videoUrl ? (
                      <video
                        src={getVideoUrl(car.videoUrl)}
                        controls
                        autoPlay
                        playsInline
                        preload="auto"
                        className="w-full h-full object-cover"
                      >
                        <source src={getVideoUrl(car.videoUrl)} type="video/mp4" />
                        <source src={`/${encodeURIComponent(car.videoUrl)}`} type="video/mp4" />
                        <source src="/GLE%2053%20MAIN%20VIDEO.mp4" type="video/mp4" />
                      </video>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#111111] via-[#090909] to-black p-8 text-center space-y-2 select-none">
                        <div className="w-12 h-12 rounded-full border border-sky-400/30 bg-sky-950/30 flex items-center justify-center text-sky-400 mb-1">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="font-sans font-black text-white text-lg tracking-wider uppercase">BAKO CARS ABUJA</span>
                        <span className="font-mono text-xs text-sky-400 tracking-[0.25em] uppercase font-bold">VERIFIED ARRIVAL IN STOCK</span>
                        <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest max-w-sm">
                          {car.location || 'Behind Tsukunda House, Abuja'} • Photoshoot In Progress
                        </p>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Fullscreen Zoom Trigger in Top Left */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                        className="absolute top-3 left-3 z-10 p-2 bg-black/70 hover:bg-black text-white rounded border border-white/20 transition-all backdrop-blur-sm"
                        title="Fullscreen zoom"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      <img
                        src={getImageUrl(car.images[activeImageIdx], 1080)}
                        alt={`${car.make} ${car.model}`}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          handleImageFallback(e, car.images[activeImageIdx]);
                        }}
                      />

                      {/* Overlaid Navigation Arrows */}
                      {car.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black text-white rounded-full border border-white/20 transition-colors backdrop-blur-sm"
                            aria-label="Previous Image"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black text-white rounded-full border border-white/20 transition-colors backdrop-blur-sm"
                            aria-label="Next Image"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Thumbnails Row */}
                {!isVideoMode && car.images.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" id="image-thumbnails-wrapper">
                    {car.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIdx(index)}
                        className={`aspect-[16/10] rounded overflow-hidden border transition-all relative cursor-pointer ${
                          index === activeImageIdx
                            ? 'border-white ring-2 ring-white/60'
                            : 'border-neutral-800 opacity-60 hover:opacity-100'
                        }`}
                        id={`thumbnail-btn-${index}`}
                      >
                        <img
                          src={getImageUrl(img, 200)}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            handleImageFallback(e, img);
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Description Container (Motor Cars of Chicago style) */}
              <div className="bg-[#121212] border border-neutral-800/80 rounded-lg p-5 sm:p-6 space-y-4">
                <h3 className="font-sans text-xs sm:text-sm font-black tracking-[0.2em] uppercase text-white border-b border-neutral-800 pb-3">
                  VEHICLE DESCRIPTION
                </h3>
                <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed uppercase tracking-wider font-mono">
                  {car.description || `THIS ${car.year} ${car.make} ${car.model} DELIVERS A FOCUSED MIX OF PERFORMANCE, LUXURY, AND PRESENCE. AVAILABLE FOR IMMEDIATE INSPECTION AND NATIONWIDE DELIVERY IN NIGERIA.`}
                </p>

                {/* Highlights List */}
                {car.highlights && car.highlights.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">
                      KEY EQUIPMENT & SPECIFICATIONS
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {car.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center space-x-2 text-xs text-neutral-300 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="uppercase text-[11px]">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Spec Table, Pricing & Action CTAs */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Specs & Pricing Panel */}
              <div className="bg-[#121212] border border-neutral-800/80 rounded-lg p-5 sm:p-6 space-y-6">
                
                {/* VIN & Stock # Top Meta */}
                <div className="flex justify-between items-center font-mono text-[10px] text-neutral-400 border-b border-neutral-800 pb-3">
                  <span>VIN: <strong className="text-white font-bold">{car.vin || 'N/A'}</strong></span>
                  <span>STOCK #: <strong className="text-white font-bold">{car.stockNumber || '10601'}</strong></span>
                </div>

                {/* Motor Cars of Chicago Key-Value Specs Table */}
                <div className="space-y-2.5 font-mono text-xs">
                  <h3 className="text-[10px] font-bold uppercase text-neutral-500 tracking-[0.2em] mb-3">
                    VEHICLE DETAILS
                  </h3>
                  <div className="divide-y divide-neutral-800/80 space-y-2.5">
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-neutral-400 uppercase">MILES:</span>
                      <span className="font-bold text-white uppercase">{formatMileage(car.mileage)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">TRANSMISSION:</span>
                      <span className="font-bold text-white uppercase">{car.transmission || 'AUTOMATIC'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">ENGINE:</span>
                      <span className="font-bold text-white uppercase">{car.engine || `${car.power} HP`}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">DRIVETRAIN:</span>
                      <span className="font-bold text-white uppercase">{car.drivetrain || 'AWD'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">COLOR:</span>
                      <span className="font-bold text-white uppercase">{car.exteriorColor || 'BLACK'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">INTERIOR:</span>
                      <span className="font-bold text-white uppercase">{car.interiorColor || 'BLACK'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">BODY STYLE:</span>
                      <span className="font-bold text-white uppercase">{car.bodyType || 'COUPE'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-400 uppercase">LOCATION:</span>
                      <span className="font-bold text-emerald-400 uppercase text-right text-xs">{car.location || 'Abuja'}</span>
                    </div>
                  </div>
                </div>

                {/* Price Display */}
                <div className="pt-4 border-t border-neutral-800">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400 block mb-1">
                    {car.price && car.price > 0 ? 'PRICE' : 'PRICE ON APPLICATION'}
                  </span>
                  <div className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {car.price && car.price > 0 ? formatCurrency(car.price) : car.status === 'Sold' ? 'SOLD & ARCHIVED' : 'INQUIRE FOR PRICE'}
                  </div>
                  <div className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mt-1">
                    {car.price && car.price > 0 ? '+ DUTY PAID • ABUJA INSPECTION READY' : '+ DUTY PAID • DIRECT VIP WHATSAPP INQUIRY'}
                  </div>
                </div>

                {/* Direct WhatsApp Action Button */}
                <div className="pt-2">
                  <a
                    href={waInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase py-3.5 px-4 rounded text-xs tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg"
                    id="modal-whatsapp-direct-btn"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>INQUIRE ON WHATSAPP</span>
                  </a>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Fullscreen Image Lightbox Modal */}
        {isLightboxOpen && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-2 sm:p-6 select-none backdrop-blur-md animate-fade-in touch-pan-y"
            id="image-lightbox-overlay"
            onClick={() => setIsLightboxOpen(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={(e) => handleTouchEnd(e, true)}
          >
            {/* Close Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
              className="absolute top-4 right-4 p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-all cursor-pointer z-[110]"
              id="close-lightbox-btn"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Lightbox Stage container */}
            <div className="relative max-w-6xl max-h-[85vh] flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
              <img
                src={getImageUrl(car.images[activeImageIdx], 1600)}
                alt={`${car.make} ${car.model}`}
                className="max-w-full max-h-[72vh] md:max-h-[80vh] object-contain rounded-lg border border-neutral-800 shadow-2xl pointer-events-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  handleImageFallback(e, car.images[activeImageIdx]);
                }}
              />

              {/* Prev/Next buttons */}
              {car.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white rounded-full transition-all cursor-pointer shadow-lg z-10"
                    aria-label="Previous Image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white rounded-full transition-all cursor-pointer shadow-lg z-10"
                    aria-label="Next Image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Caption */}
            <div className="mt-4 text-center space-y-1" onClick={(e) => e.stopPropagation()}>
              <h4 className="font-sans text-sm md:text-base font-black tracking-[0.15em] text-white uppercase">
                {car.year} {car.make} {car.model}
              </h4>
              <p className="font-mono text-[10px] text-neutral-400 tracking-[0.2em] uppercase">
                PHOTO {activeImageIdx + 1} OF {car.images.length}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}


