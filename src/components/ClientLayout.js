import React from 'react';
import styles from './ClientLayout.module.css';

const ClientLayout = ({ children }) => {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;