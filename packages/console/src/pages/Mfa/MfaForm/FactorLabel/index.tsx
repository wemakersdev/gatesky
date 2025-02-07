import { type AdminConsoleKey } from '@logto/phrases';
import { MfaFactor } from '@logto/schemas';

import MfaFactorTitle from '@/components/MfaFactorTitle';
import DynamicT from '@/ds-components/DynamicT';

import * as styles from './index.module.scss';

type Props = {
  type: MfaFactor;
};

const factorDescriptionLabel: Record<MfaFactor, AdminConsoleKey> = {
  [MfaFactor.TOTP]: 'mfa.otp_description',
  [MfaFactor.WebAuthn]: 'mfa.webauthn_description',
  [MfaFactor.BackupCode]: 'mfa.backup_code_description',
};

function FactorLabel({ type }: Props) {
  return (
    <div className={styles.factorLabel}>
      <MfaFactorTitle type={type} />
      <div className={styles.factorDescription}>
        <DynamicT forKey={factorDescriptionLabel[type]} />
      </div>
    </div>
  );
}

export default FactorLabel;
