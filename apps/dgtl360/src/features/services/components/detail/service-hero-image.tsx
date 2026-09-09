import Image from 'next/image';
import type { Service } from '../../types/service.types';
import styles from '../../service-detail.module.css';

export function ServiceHeroImage({ service }: { service: Service }) {
  return (
    <figure className={styles.serviceVisual} aria-label={`${service.label} service image`}>
      <Image
        src={service.image}
        alt={service.imageAlt || `${service.label} service visual`}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 1000px) 100vw, 40vw"
        style={{ objectFit: 'cover', objectPosition: service.imagePosition }}
      />
      <figcaption>
        <span>{String(service.order).padStart(2, '0')}</span>
        {service.label}
      </figcaption>
    </figure>
  );
}
