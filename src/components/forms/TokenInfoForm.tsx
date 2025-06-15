import React from 'react';
import { useForm } from 'react-hook-form';

const TokenInfoForm: React.FC = () => {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Token Info</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="form-label" htmlFor="initialMarketCapExLiquidity">
              Initial Market Cap (ex. liquidity)
            </label>
            <input
              id="initialMarketCapExLiquidity"
              type="text"
              className="form-input"
              placeholder="e.g. $1,000,000"
              {...register('initialMarketCapExLiquidity')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('initialMarketCapExLiquidity_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="initialMarketCap">
              Initial Market Cap
            </label>
            <input
              id="initialMarketCap"
              type="text"
              className="form-input"
              placeholder="e.g. $1,200,000"
              {...register('initialMarketCap')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('initialMarketCap_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="fullyDilutedMarketCap">
              Fully Diluted Market Cap
            </label>
            <input
              id="fullyDilutedMarketCap"
              type="text"
              className="form-input"
              placeholder="e.g. $10,000,000"
              {...register('fullyDilutedMarketCap')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('fullyDilutedMarketCap_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="circulatingSupplyAtTge">
              Circulating Supply at TGE
            </label>
            <input
              id="circulatingSupplyAtTge"
              type="text"
              className="form-input"
              placeholder="e.g. 20,000,000"
              {...register('circulatingSupplyAtTge')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('circulatingSupplyAtTge_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tgeSupplyPercentage">
              TGE Supply %
            </label>
            <input
              id="tgeSupplyPercentage"
              type="text"
              className="form-input"
              placeholder="e.g. 20%"
              {...register('tgeSupplyPercentage')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tgeSupplyPercentage_status')}>
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

export default TokenInfoForm;