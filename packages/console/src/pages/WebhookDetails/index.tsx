import { withAppInsights } from '@logto/app-insights/react';
import { type HookResponse, type Hook } from '@logto/schemas';
import classNames from 'classnames';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import useSWR from 'swr';

import Delete from '@/assets/icons/delete.svg';
import Forbidden from '@/assets/icons/forbidden.svg';
import More from '@/assets/icons/more.svg';
import Shield from '@/assets/icons/shield.svg';
import WebhookDark from '@/assets/icons/webhook-dark.svg';
import Webhook from '@/assets/icons/webhook.svg';
import DetailsPage from '@/components/DetailsPage';
import PageMeta from '@/components/PageMeta';
import SuccessRate from '@/components/SuccessRate';
import { WebhookDetailsTabs } from '@/consts';
import ActionMenu, { ActionMenuItem } from '@/ds-components/ActionMenu';
import Card from '@/ds-components/Card';
import CopyToClipboard from '@/ds-components/CopyToClipboard';
import DynamicT from '@/ds-components/DynamicT';
import TabNav, { TabNavItem } from '@/ds-components/TabNav';
import Tag from '@/ds-components/Tag';
import useApi, { type RequestError } from '@/hooks/use-api';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import useTenantPathname from '@/hooks/use-tenant-pathname';
import useTheme from '@/hooks/use-theme';
import { buildUrl } from '@/utils/url';

import * as styles from './index.module.scss';
import { type WebhookDetailsOutletContext } from './types';

function WebhookDetails() {
  const { t } = useTranslation(undefined, { keyPrefix: 'admin_console' });
  const { pathname } = useLocation();
  const isPageHasTable = pathname.endsWith(WebhookDetailsTabs.RecentRequests);
  const { navigate } = useTenantPathname();
  const { id } = useParams();
  const { data, error, mutate } = useSWR<HookResponse, RequestError>(
    id && buildUrl(`api/hooks/${id}`, { includeExecutionStats: String(true) })
  );
  const { enabled: isEnabled, executionStats } = data ?? {};
  const isLoading = !data && !error;
  const api = useApi();

  const theme = useTheme();
  const WebhookIcon = theme === 'light' ? Webhook : WebhookDark;

  const { show } = useConfirmModal();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingEnableState, setIsUpdatingEnableState] = useState(false);

  const handleDelete = async () => {
    if (!data || isDeleting) {
      return;
    }

    const [result] = await show({
      ModalContent: () => <DynamicT forKey="webhook_details.deletion_reminder" />,
      confirmButtonText: 'general.delete',
    });

    if (!result) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.delete(`api/hooks/${data.id}`);
      toast.success(t('webhook_details.deleted', { name: data.name }));
      navigate('/webhooks');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleEnableState = async () => {
    if (!data || isUpdatingEnableState) {
      return;
    }

    if (isEnabled) {
      const [result] = await show({
        ModalContent: () => <DynamicT forKey="webhook_details.disable_reminder" />,
        confirmButtonText: 'webhook_details.disable_webhook',
      });

      if (!result) {
        return;
      }
    }

    setIsUpdatingEnableState(true);

    try {
      const updatedHook = await api
        .patch(`api/hooks/${data.id}`, { json: { enabled: !isEnabled } })
        .json<Hook>();
      void mutate({ ...updatedHook, executionStats: data.executionStats });
      const { enabled } = updatedHook;
      toast.success(
        t(enabled ? 'webhook_details.webhook_reactivated' : 'webhook_details.webhook_disabled')
      );
    } finally {
      setIsUpdatingEnableState(false);
    }
  };

  return (
    <DetailsPage
      backLink="/webhooks"
      backLinkTitle="webhook_details.back_to_webhooks"
      className={classNames(isPageHasTable && styles.containsTableLayout)}
      isLoading={isLoading}
      error={error}
      onRetry={mutate}
    >
      <PageMeta titleKey="webhook_details.page_title" />
      {data && (
        <>
          <Card className={styles.header}>
            <WebhookIcon className={styles.webhookIcon} />
            <div className={styles.metadata}>
              <div className={styles.title}>{data.name}</div>
              <div>
                {isEnabled && executionStats ? (
                  <div className={styles.state}>
                    {executionStats.requestCount > 0 && (
                      <>
                        <SuccessRate
                          className={styles.successRate}
                          successCount={executionStats.successCount}
                          totalCount={executionStats.requestCount}
                        />
                        <DynamicT forKey="webhook_details.success_rate" />
                        <div className={styles.verticalBar} />
                      </>
                    )}
                    <DynamicT
                      forKey="webhook_details.requests"
                      interpolation={{ value: executionStats.requestCount }}
                    />
                  </div>
                ) : (
                  <Tag type="state" status="info">
                    <DynamicT forKey="webhook_details.not_in_use" />
                  </Tag>
                )}
                <div className={styles.verticalBar} />
                <div className={styles.text}>ID</div>
                <CopyToClipboard size="small" value={data.id} />
              </div>
            </div>
            <div>
              <ActionMenu
                buttonProps={{ icon: <More className={styles.icon} />, size: 'large' }}
                title={t('general.more_options')}
              >
                <ActionMenuItem
                  icon={isEnabled ? <Forbidden /> : <Shield />}
                  iconClassName={styles.icon}
                  onClick={handleToggleEnableState}
                >
                  <DynamicT
                    forKey={
                      isEnabled
                        ? 'webhook_details.disable_webhook'
                        : 'webhook_details.reactivate_webhook'
                    }
                  />
                </ActionMenuItem>
                <ActionMenuItem icon={<Delete />} type="danger" onClick={handleDelete}>
                  <DynamicT forKey="webhook_details.delete_webhook" />
                </ActionMenuItem>
              </ActionMenu>
            </div>
          </Card>
          <TabNav>
            <TabNavItem href={`/webhooks/${data.id}/${WebhookDetailsTabs.Settings}`}>
              <DynamicT forKey="webhook_details.settings_tab" />
            </TabNavItem>
            <TabNavItem href={`/webhooks/${data.id}/${WebhookDetailsTabs.RecentRequests}`}>
              <DynamicT forKey="webhook_details.recent_requests_tab" />
            </TabNavItem>
          </TabNav>
          <Outlet
            context={
              {
                hook: data,
                isDeleting,
                onHookUpdated: (hook) => {
                  if (hook) {
                    const { executionStats } = data;
                    void mutate({ ...hook, executionStats });
                    return;
                  }
                  void mutate();
                },
              } satisfies WebhookDetailsOutletContext
            }
          />
        </>
      )}
    </DetailsPage>
  );
}

export default withAppInsights(WebhookDetails);
