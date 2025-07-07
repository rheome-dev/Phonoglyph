const handleFileUpload = async (files: File[]) => {
  const midiFiles = files.filter((file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ext === 'mid' || ext === 'midi';
  });
} 