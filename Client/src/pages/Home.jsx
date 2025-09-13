import React from 'react'

import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate=useNavigate();
  return (
    <div className='h-185 w-screen flex flex-col justify-center items-center bg-white gap-5'>
        <h1 className='font-semibold text-3xl sm:text-6xl  text-primary'>Test Forge</h1>
        <p className='text-primary/50'>A bridge to get connect with AI to generate test cases</p>
      <div className=''>{/*we use tailwind classes bg-primary here primary is utility class from index.css */}
        <button onClick={()=>navigate('/login')} className='flex gap-2 items-center text-white rounded px-3 py-1 bg-primary/80 hover:cursor-pointer hover:bg-primary text white'>Go to Login</button>
      </div> 
    </div>
  )
}

export default Home
