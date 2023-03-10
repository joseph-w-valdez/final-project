import React from 'react';

const FileInput = ({ onChange }) => {
  const handleOnChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 15 * 1024 * 1024) {
      onChange(e);
    } else {
      alert('File size should be less than or equal to 15MB');
    }
  };

  return (
    <input
      type="file"
      onChange={handleOnChange}
      accept=".png, .jpg, .jpeg, .gif"
      className='text-white max-w-[250px]'
    />
  );
};

export default FileInput;
