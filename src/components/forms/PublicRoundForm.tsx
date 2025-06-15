import React from 'react';
import { useForm } from 'react-hook-form';

const PublicRoundForm: React.FC = () => {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Public Round (IDO) | Metrics</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label" htmlFor="whitelistingStartTime">
              Whitelisting Start Time
            </label>
            <input
              id="whitelistingStartTime"
              type="datetime-local"
              className="form-input"
              {...register('whitelistingStartTime')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('whitelistingStartTime_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="idoLaunchDate">
              IDO Launch Date
            </label>
            <input
              id="idoLaunchDate"
              type="datetime-local"
              className="form-input"
              {...register('idoLaunchDate')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('idoLaunchDate_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenClaimingDate">
              Token Claiming Date
            </label>
            <input
              id="tokenClaimingDate"
              type="datetime-local"
              className="form-input"
              {...register('tokenClaimingDate')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenClaimingDate_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="cexDexListingDate">
              CEX/DEX Listing Date
            </label>
            <input
              id="cexDexListingDate"
              type="datetime-local"
              className="form-input"
              {...register('cexDexListingDate')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('cexDexListingDate_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenPrice">
              Token Price
            </label>
            <input
              id="tokenPrice"
              type="text"
              className="form-input"
              placeholder="e.g. $0.05"
              {...register('tokenPrice')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenPrice_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="allocationUSD">
              Allocation in USD
            </label>
            <input
              id="allocationUSD"
              type="text"
              className="form-input"
              placeholder="e.g. $500"
              {...register('allocationUSD')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('allocationUSD_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="allocationTokenAmount">
              Allocation in Token Amount
            </label>
            <input
              id="allocationTokenAmount"
              type="text"
              className="form-input"
              placeholder="e.g. 10,000"
              {...register('allocationTokenAmount')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('allocationTokenAmount_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tgeUnlockPercentage">
              TGE Unlock %
            </label>
            <input
              id="tgeUnlockPercentage"
              type="text"
              className="form-input"
              placeholder="e.g. 20%"
              {...register('tgeUnlockPercentage')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tgeUnlockPercentage_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="cliffLock">
              Cliff / Lock
            </label>
            <input
              id="cliffLock"
              type="text"
              className="form-input"
              placeholder="e.g. 1 month"
              {...register('cliffLock')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('cliffLock_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="vestingDuration">
              Vesting Duration
            </label>
            <input
              id="vestingDuration"
              type="text"
              className="form-input"
              placeholder="e.g. 6 months"
              {...register('vestingDuration')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('vestingDuration_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenTicker">
              Token Ticker
            </label>
            <input
              id="tokenTicker"
              type="text"
              className="form-input"
              placeholder="e.g. DCB"
              {...register('tokenTicker')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenTicker_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="network">
              Network
            </label>
            <input
              id="network"
              type="text"
              className="form-input"
              placeholder="e.g. Ethereum"
              {...register('network')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('network_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="gracePeriod">
              Grace Period
            </label>
            <input
              id="gracePeriod"
              type="text"
              className="form-input"
              placeholder="e.g. 24 hours"
              {...register('gracePeriod')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('gracePeriod_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenContractAddress">
              Token Contract Address
            </label>
            <input
              id="tokenContractAddress"
              type="text"
              className="form-input"
              placeholder="e.g. 0x..."
              {...register('tokenContractAddress')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenContractAddress_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenTransferTxId">
              Token Transfer TX ID
            </label>
            <input
              id="tokenTransferTxId"
              type="text"
              className="form-input"
              placeholder="e.g. 0x..."
              {...register('tokenTransferTxId')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenTransferTxId_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublicRoundForm;