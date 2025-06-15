import React from 'react';
import { useForm } from 'react-hook-form';

const PlatformSetupForm: React.FC = () => {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Platform Setup</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="form-label" htmlFor="tagline">
              Tagline
            </label>
            <input
              id="tagline"
              type="text"
              className="form-input"
              placeholder="Brief project tagline"
              {...register('tagline')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tagline_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="projectDescription">
              Project Description
            </label>
            <textarea
              id="projectDescription"
              rows={4}
              className="form-input"
              placeholder="Detailed project description"
              {...register('projectDescription')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('projectDescription_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label" htmlFor="telegram">
                Telegram
              </label>
              <input
                id="telegram"
                type="text"
                className="form-input"
                placeholder="https://t.me/..."
                {...register('telegram')}
              />
              <div className="mt-1 flex items-center space-x-2">
                <select className="text-sm border rounded p-1" {...register('telegram_status')}>
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="form-label" htmlFor="twitter">
                Twitter
              </label>
              <input
                id="twitter"
                type="text"
                className="form-input"
                placeholder="https://twitter.com/..."
                {...register('twitter')}
              />
              <div className="mt-1 flex items-center space-x-2">
                <select className="text-sm border rounded p-1" {...register('twitter_status')}>
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="form-label" htmlFor="discord">
                Discord
              </label>
              <input
                id="discord"
                type="text"
                className="form-input"
                placeholder="https://discord.gg/..."
                {...register('discord')}
              />
              <div className="mt-1 flex items-center space-x-2">
                <select className="text-sm border rounded p-1" {...register('discord_status')}>
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="form-label" htmlFor="youtube">
                YouTube
              </label>
              <input
                id="youtube"
                type="text"
                className="form-input"
                placeholder="https://youtube.com/..."
                {...register('youtube')}
              />
              <div className="mt-1 flex items-center space-x-2">
                <select className="text-sm border rounded p-1" {...register('youtube_status')}>
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="form-label" htmlFor="linkedin">
                LinkedIn
              </label>
              <input
                id="linkedin"
                type="text"
                className="form-input"
                placeholder="https://linkedin.com/..."
                {...register('linkedin')}
              />
              <div className="mt-1 flex items-center space-x-2">
                <select className="text-sm border rounded p-1" {...register('linkedin_status')}>
                  <option value="Not Confirmed">Not Confirmed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Might Still Change">Might Still Change</option>
                </select>
              </div>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="tokenomicsFile">
              Tokenomics File (URL)
            </label>
            <input
              id="tokenomicsFile"
              type="text"
              className="form-input"
              placeholder="https://..."
              {...register('tokenomicsFile')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('tokenomicsFile_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="teamPage">
              Team Page
            </label>
            <input
              id="teamPage"
              type="text"
              className="form-input"
              placeholder="https://..."
              {...register('teamPage')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('teamPage_status')}>
                <option value="Not Confirmed">Not Confirmed</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Might Still Change">Might Still Change</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="form-label" htmlFor="roadmapPage">
              Roadmap Page
            </label>
            <input
              id="roadmapPage"
              type="text"
              className="form-input"
              placeholder="https://..."
              {...register('roadmapPage')}
            />
            <div className="mt-1 flex items-center space-x-2">
              <select className="text-sm border rounded p-1" {...register('roadmapPage_status')}>
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

export default PlatformSetupForm;