import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom";

import contactImg from "../../assets/img/contactImg.jpg";
import styles from "./ContactCard.module.css"

export const ContactCard = () => {

  const { t } = useTranslation();
  const whaLink: string = 'https://wa.me/19179156583?text=%F0%9F%91%8B%20%C2%A1Hola!%0AGracias%20por%20comunicarte%20con%20JoTu%20Solutions%20LLC.%0A%0A%F0%9F%95%92%20Nuestro%20horario%20de%20atenci%C3%B3n%20es:%0ALunes%20a%20Viernes%20de%209:00%20a.m.%20a%205:00%20p.m.%20(hora%20Miami).%0A%0A%E2%9C%85%20En%20breve,%20uno%20de%20nuestros%20representantes%20te%20responder%C3%A1.%0AMientras%20tanto,%20por%20favor%20dinos%20tu%20nombre%20y%20c%C3%B3mo%20podemos%20ayudarte.%0A%0A%F0%9F%93%8C%20%C2%A1Gracias%20por%20elegir%20a%20JoTu%20Solutions%20LLC'
  const mailLink: string = t('footer.mailRedirect')

  return (
    <section className={styles.container}>
      <img src={contactImg} className={styles.contactImg} />
      <div className={styles.wrapper}>
        <div className={styles.redirects}>
          <p className={styles.title}>{t("card.schedule")}</p>
          <a className={styles.item} href={whaLink}>{'+1(917)915-6583'}</a>
          <a className={styles.item} href={mailLink}>info@zumiasolutions.xyz</a>
        </div>
        <Link to="/contact" className={styles.button}>{t("card.contactUs")}</Link>
      </div>
    </section>
  )
}