import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";
import logo from "../../assets/img/JoTu_color_1.png";

export const SplashScreen = ({ onReady, onFinish }: {
  onReady: () => void;
  onFinish: () => void;
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const readyTimer = setTimeout(() => {
      onReady();
    }, 1200);
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 1600);
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2300);

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    }
  }, []);

  return (
    <div className={`${styles.splash} ${!visible ? styles.hide : ""}`}>
      <img src={logo} className={styles.logo} alt="logo" />
    </div>
  );
};
