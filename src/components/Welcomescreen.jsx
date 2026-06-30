import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';

const WelcomeScreen = () => {
  // Get selected language from Redux store
  const selectedLanguage = useSelector((state) => state.chat.selectedLanguage);
  
  // Language content object
  const content = {
    en: {
      title: 'Start chatting',
      subtitle: 'This chatbot is configured to answer your questions'
    },
    fr: {
      title: 'Démarrez une session de chat'
      //subtitle: 'Ce chatbot est conçu pour répondre à vos questions'
    }
  };

  // Get current language content
  const currentContent = content[selectedLanguage] || content.en;

  return (
    <motion.div
      id='welcome'
      className='flex flex-col items-center justify-center h-[70vh] p-8 text-center'
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h1 className='text-4xl font-semibold mb-4 text-gray-800'>
        {currentContent.title}
      </h1>
      <p className='text-gray-600'>
        {currentContent.subtitle}
      </p>
    </motion.div>
  );
};

export default WelcomeScreen;
