const fs = require('fs');
const path = require('path');

const studentPages = ['Dashboard', 'Academics', 'Bus', 'Library', 'Fees', 'Notifications'];
const adminPages = ['Dashboard', 'Students', 'Academics', 'Bus', 'Library', 'Fees', 'Notifications'];

const createComponent = (dir, name) => {
  const content = `import React from 'react';

const ${name} = () => {
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">${name}</h2>
      <p className="text-gray-600">This is the ${name} page.</p>
    </div>
  );
};

export default ${name};
`;
  const dirPath = path.join(__dirname, 'src', 'pages', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, `${name}.jsx`), content);
};

studentPages.forEach(p => createComponent('student', p));
adminPages.forEach(p => createComponent('admin', p));
console.log('Scaffolding complete');
