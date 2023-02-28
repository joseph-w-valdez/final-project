import React, { useState } from 'react';
import Button from '../components/Button';

const Register = ({ onMount }) => {

  const [usernameInputValue, setUsernameInputValue] = useState('');
  const [passwordInputvalue, setPasswordInputValue] = useState('');

  onMount();

  return (
    <div className='text-white mx-7 mt-2 font-Poppins flex flex-wrap justify-center'>
      <h1 className='text-4xl text-center mb-2'>REGISTER</h1>
      <div className='basis-full' />
      <form className='text-center text-black'>
        <input
          type="text"
          placeholder='Username'
          className='w-72 h-9 rounded px-3 mt-3'
          value={usernameInputValue}
          onChange={(e) => setUsernameInputValue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder='Email'
          className='w-72 h-9 rounded px-3 mt-3'
          value={passwordInputvalue}
          onChange={(e) => setPasswordInputValue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder='Confirm Email'
          className='w-72 h-9 rounded px-3 mt-3'
          value={passwordInputvalue}
          onChange={(e) => setPasswordInputValue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder='Password'
          className='w-72 h-9 rounded px-3 mt-3'
          value={passwordInputvalue}
          onChange={(e) => setPasswordInputValue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder='Confirm Password'
          className='w-72 h-9 rounded px-3 mt-3'
          value={passwordInputvalue}
          onChange={(e) => setPasswordInputValue(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder='Upload Profile Picture (optional)'
          className='w-72 h-9 rounded px-3 mt-3'
          value={passwordInputvalue}
          onChange={(e) => setPasswordInputValue(e.target.value)}
        />
        <div className='basis-full' />
        <Button text='Sign Up' type="submit" />
      </form>
      <p className='text-white text-sm'>
        By creating an account, you agree to our <a href="" className='text-blue-500 underline'>Terms of Use</a> and our <a href="" className='text-blue-500 underline'> Privacy Policy</a>
      </p>
    </div>
  );
};

export default Register;