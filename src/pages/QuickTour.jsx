// src/pages/QuickTour.jsx
import React from 'react';
import Header from '../components/Header';
import Assistant from '../assets/EVOLVE Knowledge Assistant.mp4';
import VideoThumbnail from '../assets/Thumbnail.jpg'; 

const QuickTour = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Main Content Container */}
      <div className="flex flex-col items-center justify-center px-4 py-8">
        
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-12 text-center">
          Quick Tour
        </h1>

        {/* Video Container */}
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          
          {/* Video Player */}
          <div className="relative bg-black">
            <video 
              className="w-full h-96 md:h-[500px] lg:h-[500px] object-contain"
              controls
              poster={VideoThumbnail}
              preload="metadata"
            >
              <source src={Assistant} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Additional Information */}
        <div className="max-w-5xl w-full mt-8 text-center">
          <p className="text-gray-600 text-lg">
            Learn how to use the Evolve Knowledge Assistant with this comprehensive quick tour.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickTour;
