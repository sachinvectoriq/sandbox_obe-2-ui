import { useState } from 'react';
import { X } from 'lucide-react';

const MaintenanceBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className='fixed left-0 right-0 z-50 px-4' style={{ top: '72px' }}>
      <div className='max-w-[1400px] mx-auto'>
        <div className='bg-yellow-50 border border-yellow-300 rounded-lg shadow-md px-5 py-3 flex gap-3 items-start'>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='#b8860b'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='flex-shrink-0 mt-1'
          >
            <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
            <line x1='12' y1='9' x2='12' y2='13' />
            <line x1='12' y1='17' x2='12.01' y2='17' />
          </svg>

          <div className='flex-1'>
            <p className='text-sm font-medium text-yellow-800 mb-1'>
              Scheduled Maintenance -Friday, 6/12, starting at 9:00 AM ET through Sunday, 6/14
            </p>

            <p className='text-sm text-yellow-700 leading-6'>
              There is scheduled maintenance that affects the Knowledge Assistant.
            </p>

            <p className='text-sm text-yellow-700 leading-6 mt-1'>
              Please be aware that the Knowledge Assistant may be inaccessible during phases of the planned maintenance. Please anticipate potential disruption until the maintenance is completed.
            </p>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className='flex-shrink-0 text-yellow-600 hover:text-yellow-900 transition-colors cursor-pointer mt-0.5'
            title='Dismiss'
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
