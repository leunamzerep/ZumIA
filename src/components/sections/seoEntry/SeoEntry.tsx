import { useEffect, useState } from "react";

import styles from './SeoEntry.module.css'

type SeoEntryProps = {
  imgPath: string;
  content: string;
}

export const SeoEntry = ({ imgPath, content }: SeoEntryProps) => {

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`${styles.titleContainer} ${animate ? styles.appear : ""}`}>
      <img src={imgPath} className={styles.mainImg} />
      <h1 className={styles.mainTitle}>{content}</h1>
    </div>
  )
}