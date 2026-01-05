import { useEffect, useState } from "react";

import styles from './SeoEntry.module.css'

type SeoEntryProps = {
  imgPath: string;
  content: string;
  canAnimate: boolean;
}

export const SeoEntry = ({ imgPath, content, canAnimate }: SeoEntryProps) => {

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  return (
    <div className={`${styles.titleContainer} ${animate ? styles.appear : ""}`}>
      <img src={imgPath} className={styles.mainImg} />
      <h1 className={styles.mainTitle}>{content}</h1>
    </div>
  )
}