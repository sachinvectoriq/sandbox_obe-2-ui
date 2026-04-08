import { Outlet } from 'react-router-dom';
import GlobalToastContainer from './components/GlobalToastContainer';

function App() {
  return (
    <>
      <Outlet /> 
      <GlobalToastContainer />
    </>
  );
  
}

export default App;
