import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Service } from '../../types/service.types';
import type { CMSSiteSettings } from '../../../../lib/cms';
import styles from '../../service-detail.module.css';

type CinemaService = Pick<
  Service,
  'slug' | 'label' | 'image' | 'imagePosition' | 'accent'
>;

function ReelCard({
  service,
  currentSlug,
  duplicate,
}: {
  service: CinemaService;
  currentSlug: string;
  duplicate: boolean;
}) {
  const isCurrent = service.slug === currentSlug;

  return (
    <li>
      <Link
        className={styles.reelCard}
        data-current={isCurrent || undefined}
        href={`/services/${service.slug}`}
        aria-current={!duplicate && isCurrent ? 'page' : undefined}
        tabIndex={duplicate ? -1 : undefined}
        style={{ '--reel-accent': service.accent } as CSSProperties}
      >
        <Image
          className={styles.reelImage}
          src={service.image}
          alt=""
          fill
          loading={isCurrent ? 'eager' : 'lazy'}
          sizes="(max-width: 680px) 70vw, (max-width: 1200px) 30vw, 260px"
          style={{ objectFit: 'cover', objectPosition: service.imagePosition }}
        />
        <strong>{service.label}</strong>
      </Link>
    </li>
  );
}

export function ServiceCinemaReel({
  services,
  currentSlug,
  labels,
}: {
  services: CinemaService[];
  currentSlug: string;
  labels?: CMSSiteSettings['serviceContent'];
}) {
  return (
    <section className={styles.cinemaReel} aria-labelledby="service-reel-title" data-service-reveal>
      <header className={styles.reelHeader}>
        <p>{labels?.reelKicker || 'DGTL 360 / SERVICE REEL'}</p>
        <h2 id="service-reel-title">{labels?.reelHeading || 'Explore every service'}</h2>
        <span>{labels?.reelInstruction || 'HOVER TO HOLD · SELECT A FRAME'}</span>
      </header>

      <div className={styles.reelViewport}>
        <div className={styles.reelTrack}>
          {[false, true].map((duplicate) => (
            <ul className={styles.reelList} aria-hidden={duplicate || undefined} key={String(duplicate)}>
              {services.map((service) => (
                <ReelCard
                  service={service}
                  currentSlug={currentSlug}
                  duplicate={duplicate}
                  key={`${duplicate ? 'duplicate' : 'primary'}-${service.slug}`}
                />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
