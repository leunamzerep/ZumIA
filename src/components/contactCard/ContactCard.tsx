import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom";

import contactImg from "../../assets/img/contactImg.jpg";
import styles from "./ContactCard.module.css"
import { useLocalizedPath } from "../../i18n/useLocalizedPath";

export const ContactCard = () => {

  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const whaLink: string = 'https://wa.me/573224286264?text=%C2%A1Hola%21%2C%20estoy%20explorando%20opciones%20para%20mejorar%20mi%20presencia%20digital%20y%20ganar%20m%C3%A1s%20clientes.%20%C2%BFMe%20podr%C3%ADas%20brindar%20m%C3%A1s%20informaci%C3%B3n%3F'
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
        <Link to={localizePath("/contact")} className={styles.button}>{t("card.contactUs")}</Link>
      </div>
    </section>
  )
}
