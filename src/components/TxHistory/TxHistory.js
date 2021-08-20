// @flow

import React, {useEffect, useState} from 'react'
import {useDispatch, useSelector} from 'react-redux'
import {useNavigationState} from '@react-navigation/native'
import {View, RefreshControl, ScrollView, Image} from 'react-native'
import SafeAreaView from 'react-native-safe-area-view'
import _ from 'lodash'
import {BigNumber} from 'bignumber.js'

import {injectIntl, defineMessages, type IntlShape} from 'react-intl'
import {fetchAccountState} from '../../actions/account'
import VotingBanner from '../Catalyst/VotingBanner'
import {Text, Banner, OfflineBanner, StatusBar, WarningBanner} from '../UiKit'
import infoIcon from '../../assets/img/icon/info-light-green.png'
import {
  transactionsInfoSelector,
  isSynchronizingHistorySelector,
  lastHistorySyncErrorSelector,
  isOnlineSelector,
  tokenBalanceSelector,
  availableAssetsSelector,
  walletMetaSelector,
  isFlawedWalletSelector,
  isFetchingAccountStateSelector,
  walletIsInitializedSelector,
} from '../../selectors'
import TxHistoryList from './TxHistoryList'
import walletManager from '../../crypto/walletManager'
import {isRegistrationOpen} from '../../crypto/shelley/catalystUtils'
import {updateHistory} from '../../actions/history'
import {checkForFlawedWallets} from '../../actions'
import {Logger} from '../../utils/logging'
import FlawedWalletModal from './FlawedWalletModal'
import StandardModal from '../Common/StandardModal'
import {WALLET_ROOT_ROUTES, CATALYST_ROUTES} from '../../RoutesList'
import {CONFIG, isByron, isHaskellShelley, isNightly} from '../../config/config'

import {formatTokenWithText} from '../../utils/format'
import image from '../../assets/img/no_transactions.png'
import globalMessages, {confirmationMessages} from '../../i18n/global-messages'

import styles from './styles/TxHistory.style'

import type {Navigation} from '../../types/navigation'
import type {Token} from '../../types/HistoryTransaction'

const messages = defineMessages({
  noTransactions: {
    id: 'components.txhistory.txhistory.noTransactions',
    defaultMessage: '!!!No transactions to show yet',
  },
})

const warningBannerMessages = defineMessages({
  title: {
    id: 'components.txhistory.txhistory.warningbanner.title',
    defaultMessage: '!!!Note:',
  },
  message: {
    id: 'components.txhistory.txhistory.warningbanner.message',
    defaultMessage: '!!!The Shelley protocol upgrade adds a new Shelley wallet type which supports delegation.',
  },
})

const NoTxHistory = injectIntl(({intl}: {intl: IntlShape}) => (
  <View style={styles.empty}>
    <Image source={image} />
    <Text style={styles.emptyText}>{intl.formatMessage(messages.noTransactions)}</Text>
  </View>
))

const SyncErrorBanner = injectIntl(({intl, showRefresh}: {intl: IntlShape, showRefresh: any}) => (
  <Banner
    error
    text={
      showRefresh
        ? intl.formatMessage(globalMessages.syncErrorBannerTextWithRefresh)
        : intl.formatMessage(globalMessages.syncErrorBannerTextWithoutRefresh)
    }
  />
))

type AvailableAmountProps = {|
  intl: IntlShape,
  amount: BigNumber,
  amountAssetMetaData: Token,
|}
const AvailableAmountBanner = injectIntl(({intl, amount, amountAssetMetaData}: AvailableAmountProps) => (
  <Banner
    label={intl.formatMessage(globalMessages.availableFunds)}
    text={amount != null ? formatTokenWithText(amount, amountAssetMetaData) : '-'}
    boldText
  />
))

type FundInfo = ?{|
  +registrationStart: string,
  +registrationEnd: string,
|}

type Props = {|
  navigation: Navigation,
  route: any,
  intl: IntlShape,
|}

const TxHistory = ({navigation, intl}: Props) => {
  const dispatch = useDispatch()

  const transactionsInfo = useSelector(transactionsInfoSelector)
  const isSyncing = useSelector(isSynchronizingHistorySelector)
  const lastSyncError = useSelector(lastHistorySyncErrorSelector)
  const isOnline = useSelector(isOnlineSelector)
  const tokenBalance = useSelector(tokenBalanceSelector)
  const availableAssets = useSelector(availableAssetsSelector)
  const isFlawedWallet = useSelector(isFlawedWalletSelector)
  const walletMeta = useSelector(walletMetaSelector)
  const isFetchingAccountState = useSelector(isFetchingAccountStateSelector)
  const isWalletInitialized = useSelector(walletIsInitializedSelector)

  // Byron warning banner
  const [showWarning, setShowWarning] = useState<boolean>(isByron(walletMeta.walletImplementationId))

  // InsufficientFundsModal (Catalyst)
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState<boolean>(false)

  // Catalyst voting registration banner
  const canVote = isHaskellShelley(walletMeta.walletImplementationId)
  const [showCatalystBanner, setShowCatalystBanner] = useState<boolean>(canVote)

  useEffect(() => {
    const run = async () => {
      // TODO: create actions
      await dispatch(fetchAccountState())
      await dispatch(updateHistory())
      dispatch(checkForFlawedWallets())

      // check catalyst fund info
      let fundInfo: FundInfo = null
      if (canVote) {
        try {
          const {currentFund} = await walletManager.fetchFundInfo()
          if (currentFund != null) {
            fundInfo = {
              registrationStart: currentFund.registrationStart,
              registrationEnd: currentFund.registrationEnd,
            }
          }
        } catch (e) {
          Logger.debug('Could not get Catalyst fund info from server', e)
        }
      }
      setShowCatalystBanner((canVote && isRegistrationOpen(fundInfo)) || isNightly() || __DEV__)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // handles back button (closes wallet)
  const routes = useNavigationState((state) => state.routes)

  // TODO: move this to dashboard once it's set as default screen
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        navigation.dispatch(e.data.action)
        if (routes.length === 1) {
          // this is the last and only route in the stack, wallet should close
          walletManager.closeWallet()
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation],
  )

  const assetMetaData = availableAssets[tokenBalance.getDefaultId()]

  if (!isWalletInitialized) {
    return (
      <View>
        <Text>loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.scrollView}>
      <StatusBar type="dark" />
      <View style={styles.container}>
        <OfflineBanner />
        {isOnline && lastSyncError && <SyncErrorBanner showRefresh={!isSyncing} />}

        <AvailableAmountBanner
          amount={tokenBalance.getDefault()}
          amountAssetMetaData={availableAssets[tokenBalance.getDefaultId()]}
        />

        {showCatalystBanner && (
          <VotingBanner
            onPress={() => {
              if (tokenBalance.getDefault().lt(CONFIG.CATALYST.MIN_ADA)) {
                setShowInsufficientFundsModal(true)
                return
              }
              navigation.navigate(CATALYST_ROUTES.ROOT)
            }}
            disabled={isFetchingAccountState}
          />
        )}
        {isFlawedWallet === true && (
          <FlawedWalletModal
            visible={isFlawedWallet === true}
            disableButtons={false}
            onPress={() => navigation.navigate(WALLET_ROOT_ROUTES.WALLET_SELECTION)}
            onRequestClose={() => navigation.navigate(WALLET_ROOT_ROUTES.WALLET_SELECTION)}
          />
        )}

        {_.isEmpty(transactionsInfo) ? (
          <ScrollView
            refreshControl={
              <RefreshControl onRefresh={async () => await dispatch(updateHistory())} refreshing={isSyncing} />
            }
          >
            <NoTxHistory />
          </ScrollView>
        ) : (
          <TxHistoryList
            refreshing={isSyncing}
            onRefresh={async () => await dispatch(updateHistory())}
            navigation={navigation}
            transactions={transactionsInfo}
          />
        )}

        {isByron(walletMeta.walletImplementationId) && showWarning && (
          <WarningBanner
            title={intl.formatMessage(warningBannerMessages.title).toUpperCase()}
            icon={infoIcon}
            message={intl.formatMessage(warningBannerMessages.message)}
            showCloseIcon
            onRequestClose={() => setShowWarning(false)}
            style={styles.warningNoteStyles}
          />
        )}

        <StandardModal
          visible={showInsufficientFundsModal}
          title={intl.formatMessage(globalMessages.attention)}
          onRequestClose={() => setShowInsufficientFundsModal(false)}
          primaryButton={{
            label: intl.formatMessage(confirmationMessages.commonButtons.backButton),
            onPress: () => setShowInsufficientFundsModal(false),
          }}
          showCloseIcon
        >
          <View>
            <Text>
              {intl.formatMessage(globalMessages.insufficientBalance, {
                requiredBalance: formatTokenWithText(CONFIG.CATALYST.DISPLAYED_MIN_ADA, assetMetaData),
                currentBalance: formatTokenWithText(tokenBalance.getDefault(), assetMetaData),
              })}
            </Text>
          </View>
        </StandardModal>
      </View>
    </SafeAreaView>
  )
}

// export default injectIntl(
//   (compose(
//     requireInitializedWallet,
//     connect(
//       (state: State) => ({
//         transactionsInfo: transactionsInfoSelector(state),
//         isSyncing: isSynchronizingHistorySelector(state),
//         lastSyncError: lastHistorySyncErrorSelector(state),
//         isOnline: isOnlineSelector(state),
//         tokenBalance: tokenBalanceSelector(state),
//         availableAssets: availableAssetsSelector(state),
//         key: languageSelector(state),
//         isFlawedWallet: isFlawedWalletSelector(state),
//         walletMeta: walletMetaSelector(state),
//         isFetchingAccountState: isFetchingAccountStateSelector(state),
//       }),
//       {
//         updateHistory,
//         checkForFlawedWallets,
//         fetchAccountState,
//       },
//     ),
//     onDidMount(({updateHistory, checkForFlawedWallets}) => {
//       checkForFlawedWallets()
//       updateHistory()
//     }),
//   )(TxHistory): ComponentType<ExternalProps>),
// )

export default injectIntl(TxHistory)
