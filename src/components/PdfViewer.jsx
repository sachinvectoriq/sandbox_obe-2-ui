import React, { useState } from 'react';
import { FiDownload, FiExternalLink, FiX } from 'react-icons/fi';
import { useSelector } from 'react-redux';

const PdfViewer = ({ url, onClose }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerFailed, setViewerFailed] = useState(false);
  const selectedLanguage = useSelector((state) => state.chat.selectedLanguage);

  // Language-based text content
  const getText = (key) => {
    const translations = {
      documentViewer: {
        en: 'Document Viewer',
        fr: 'Visionneuse de documents',
      },
      download: {
        en: 'Download',
        fr: 'Télécharger',
      },
      close: {
        en: 'Close',
        fr: 'Fermer',
      },
      noDocumentURL: {
        en: 'No document URL provided.',
        fr: 'Aucune URL de document fournie.',
      },
      previewNotAvailable: {
        en: 'Preview not available for this file type',
        fr: 'Aperçu non disponible pour ce type de fichier',
      },
      downloadFile: {
        en: 'Download File',
        fr: 'Télécharger le fichier',
      },
      loadingDocument: {
        en: 'Loading document...',
        fr: 'Chargement du document...',
      },
      failedToLoad: {
        en: 'Failed to load document',
        fr: 'Échec du chargement du document',
      },
      downloadInstead: {
        en: 'Download Instead',
        fr: 'Télécharger à la place',
      },
      openDocument: {
        en: 'Open Document',
        fr: 'Ouvrir le document',
      },
      previewUnavailable: {
        en: 'Preview could not be loaded.',
        fr: 'L\'aperçu n\'a pas pu être chargé.',
      },
    };
    return translations[key]?.[selectedLanguage] || translations[key]?.['en'];
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // Strip SAS query string from filename
      link.download = url.split('?')[0].split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  // Strips garbage characters appended after the file extension in blob URLs
  // e.g. "test-doc.docx5%D7%B1?se=...&sig=..." → "test-doc.docx?se=...&sig=..."
  // SAS query string is preserved so the Azure signature stays valid
  const cleanBlobUrl = (rawUrl) => {
    try {
      const [baseUrl, queryString] = rawUrl.split('?');
      const cleanedBase = baseUrl.replace(
        /\.(pdf|docx?|pptx?|xlsx?)(.*?)$/i,
        '.$1'
      );
      return queryString ? `${cleanedBase}?${queryString}` : cleanedBase;
    } catch (e) {
      return rawUrl;
    }
  };

  const getViewerContent = () => {
    if (!url) return <p>{getText('noDocumentURL')}</p>;

    // Step 1: Clean any garbage chars from the filename part of the URL
    const cleanedUrl = cleanBlobUrl(url);

    // Step 2: Strip SAS query string before extracting file extension
    const baseUrl = cleanedUrl.split('?')[0];
    const fileExtension = baseUrl.split('.').pop().toLowerCase();

    switch (fileExtension) {
      case 'pdf':
        return (
          <iframe
            src={cleanedUrl}
            title='PDF Viewer'
            className='w-full h-full border-0 rounded-md'
            onLoad={() => setIsLoading(false)}
            onError={() => setHasError(true)}
          />
        );

      case 'doc':
      case 'docx':
      case 'ppt':
      case 'pptx':
      case 'xls':
      case 'xlsx':
        // MS Office viewer — pass cleanedUrl directly, NO encodeURIComponent
        // SAS tokens are already URL-encoded; double-encoding breaks the signature
        if (viewerFailed) {
          return (
            <div className='flex flex-col items-center justify-center h-full gap-4'>
              <p className='text-gray-600 text-sm text-center px-4'>
                {getText('previewUnavailable')}
              </p>
              <button
                onClick={openInNewTab}
                className='flex items-center gap-2 px-4 py-2 bg-[#174a7e] text-white rounded-md hover:bg-[#082340] text-sm'
              >
                <FiExternalLink size={16} /> {getText('openDocument')}
              </button>
              <button
                onClick={handleDownload}
                className='flex items-center gap-2 text-blue-600 hover:underline text-sm'
              >
                <FiDownload size={16} /> {getText('downloadInstead')}
              </button>
            </div>
          );
        }

        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${cleanedUrl}`}
            title='Office Viewer'
            className='w-full h-full border-0 rounded-md'
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setViewerFailed(true);
              setIsLoading(false);
            }}
          />
        );

      default:
        return (
          <div className='flex flex-col items-center justify-center h-full gap-3'>
            <p className='mb-2'>{getText('previewNotAvailable')}</p>
            <button
              onClick={openInNewTab}
              className='flex items-center gap-2 px-4 py-2 bg-[#174a7e] text-white rounded-md hover:bg-[#082340] text-sm'
            >
              <FiExternalLink size={16} /> {getText('openDocument')}
            </button>
            <button
              onClick={handleDownload}
              className='flex items-center gap-2 text-blue-600 hover:underline text-sm'
            >
              <FiDownload size={16} /> {getText('downloadFile')}
            </button>
          </div>
        );
    }
  };

  return (
    <div className='p-2 h-full rounded-md flex flex-col'>
      <div className='flex justify-between items-center mb-4'>
        <h3 className='text-xl font-semibold'>{getText('documentViewer')}</h3>
        <div className='flex items-center gap-3'>
          {url && (
            <button onClick={openInNewTab} title={getText('openDocument')}>
              <FiExternalLink
                size={18}
                className='text-gray-600 hover:text-gray-800'
              />
            </button>
          )}
          {url && (
            <button onClick={handleDownload} title={getText('download')}>
              <FiDownload
                size={18}
                className='text-gray-600 hover:text-gray-800'
              />
            </button>
          )}
          <button onClick={onClose} title={getText('close')}>
            <FiX size={20} className='text-gray-600 hover:text-gray-800' />
          </button>
        </div>
      </div>

      <div className='flex-1 relative'>
        {isLoading && !hasError && (
          <div className='absolute inset-0 flex items-center justify-center'>
            <p className='text-gray-600'>{getText('loadingDocument')}</p>
          </div>
        )}

        {hasError ? (
          <div className='h-full flex flex-col items-center justify-center gap-3'>
            <p className='text-red-600 mb-2'>{getText('failedToLoad')}</p>
            <button
              onClick={openInNewTab}
              className='flex items-center gap-2 px-4 py-2 bg-[#174a7e] text-white rounded-md hover:bg-[#082340] text-sm'
            >
              <FiExternalLink size={16} /> {getText('openDocument')}
            </button>
            <button
              onClick={handleDownload}
              className='flex items-center gap-2 text-blue-600 hover:underline text-sm'
            >
              <FiDownload size={16} /> {getText('downloadInstead')}
            </button>
          </div>
        ) : (
          getViewerContent()
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
