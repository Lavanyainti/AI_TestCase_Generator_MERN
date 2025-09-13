import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';


const Navbar = () => {
 const navigate=useNavigate()

  return (
    <div >{/*we use tailwind classes bg-primary here primary is utility class from index.css */}
     <button onClick={()=>navigate('/login')}>Login</button>
    </div> 
  )
}

export default Navbar
