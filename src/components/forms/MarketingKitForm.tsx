import React from 'react';
import { useForm } from 'react-hook-form';

const MarketingKitForm: React.FC = () => {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">Marketing Kit</h2>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6">
          <label className="form-label" htmlFor="marketingKitUrl">
            Google Drive Folder URL
          </label>
          <input
            id="marketingKitUrl"
            type="text"
            className="form-input"
            placeholder="https://drive.google.com/..."
            {...register('marketingKitUrl')}
          />
          <div className="mt-1 flex items-center space-x-2">
            <select className="text-sm border rounded p-1" {...register('marketingKitUrl_status')}>
              <option value="Not Confirmed">Not Confirmed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Might Still Change">Might Still Change</option>
            </select>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Please provide a Google Drive folder URL containing all marketing materials.
          </p>
        </div>
        
        <div className="mb-6">
          <p className="form-label">Or Upload Files</p>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    type="file"
                    className="sr-only"
                    {...register('marketingKitFile')}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">ZIP, PNG, JPG up to 10MB</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Note: File upload functionality will be implemented in the future with Supabase storage.
          </p>
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

export default MarketingKitForm;